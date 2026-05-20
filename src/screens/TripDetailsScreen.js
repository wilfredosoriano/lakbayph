import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  Dimensions, Image, StatusBar, Modal, TextInput,
  Platform, Keyboard, Alert, Pressable, Share, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';
import { getTripActivities, getAllTripActivities, addTripActivity, updateTripActivity, deleteTripActivity, toggleActivityDone, updateActivityPhotos, updateActivityNotes, updateActivityLocation, getDayLabel, setDayLabel, getPackingItems, addPackingItem, togglePackingItem, deletePackingItem, reorderActivities } from '../database/db';

const { width, height: screenHeight } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);
// list pad s(16)*2 + timeCol s(52) + timelineCol s(20) + card marginLeft s(10) + card pad s(10)*2 + container pad s(10)*2 + 2 gaps s(6)*2
const PHOTO_SIZE = Math.floor((width - s(16)*2 - s(52) - s(20) - s(10) - s(10)*2 - s(10)*2 - s(6)*2) / 3);
const isExpoGo = Constants.executionEnvironment === 'storeClient';

let DraggableFlatList = null;
let ScaleDecorator = null;

if (!isExpoGo) {
  const draggableModule = require('react-native-draggable-flatlist');
  DraggableFlatList = draggableModule.default;
  ScaleDecorator = draggableModule.ScaleDecorator;
}


const CATEGORY_EMOJI = {
  bus:           '🚌',
  ferry:         '⛵',
  van:           '🚐',
  food:          '🍜',
  accommodation: '🏨',
  shop:          '🛍️',
  activity:      '🧭',
  other:         '📍',
};

const CATEGORIES = [
  { key: 'bus',           label: 'Bus',        icon: 'bus-outline' },
  { key: 'ferry',         label: 'Ferry',       icon: 'boat-outline' },
  { key: 'van',           label: 'Van',         icon: 'car-outline' },
  { key: 'food',          label: 'Food',        icon: 'restaurant-outline' },
  { key: 'accommodation', label: 'Hotel',       icon: 'bed-outline' },
  { key: 'activity',      label: 'Activity',    icon: 'compass-outline' },
  { key: 'shop',          label: 'Shop',        icon: 'bag-handle-outline' },
  { key: 'other',         label: 'Other',       icon: 'location-outline' },
];

function ActivityIconView({ category }) {
  const cat = CATEGORIES.find(c => c.key === category) || CATEGORIES[CATEGORIES.length - 1];
  return (
    <View style={styles.cardIconBox}>
      <Ionicons name={cat.icon} size={s(22)} color={Colors.primary} />
    </View>
  );
}

function parseActivityTime(time = '') {
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return { hour: '', minute: '', period: 'AM' };
  }

  return {
    hour: match[1],
    minute: match[2],
    period: match[3].toUpperCase(),
  };
}

function AddActivityModal({ visible, tripId, day, activity = null, onClose, onSaved }) {
  const insets = useSafeAreaInsets();
  const [hour, setHour]       = useState('');
  const [minute, setMinute]   = useState('');
  const [period, setPeriod]   = useState('AM');
  const [title, setTitle]     = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [notes,    setNotes]    = useState('');
  const [category, setCategory] = useState('other');
  const [saving, setSaving]   = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const isEditing = !!activity;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (!visible) return;

    if (activity) {
      const parsed = parseActivityTime(activity.time);
      setHour(parsed.hour);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
      setTitle(activity.title || '');
      setSubtitle(activity.subtitle || '');
      setNotes(activity.notes || '');
      setCategory(activity.category || 'other');
      return;
    }

    setHour('');
    setMinute('');
    setPeriod('AM');
    setTitle('');
    setSubtitle('');
    setNotes('');
    setCategory('other');
  }, [visible, activity]);

  const reset = () => {
    setHour(''); setMinute(''); setPeriod('AM');
    setTitle(''); setSubtitle(''); setNotes(''); setCategory('other');
  };

  const buildTime = () => {
    const h = hour.padStart(2, '0');
    const m = (minute || '00').padStart(2, '0');
    return `${h}:${m} ${period}`;
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Missing', 'Please enter an activity title.'); return; }
    if (!hour.trim())  { Alert.alert('Missing', 'Please enter the hour.'); return; }
    setSaving(true);
    if (activity?.id) {
      await updateTripActivity({
        id: activity.id,
        time: buildTime(),
        title: title.trim(),
        subtitle: subtitle.trim(),
        notes: notes.trim(),
        category,
      });
    } else {
      await addTripActivity({
        tripId, day,
        time: buildTime(),
        title: title.trim(),
        subtitle: subtitle.trim(),
        notes: notes.trim(),
        category,
        cost: 0,
      });
    }
    setSaving(false);
    reset();
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={() => { reset(); onClose(); }}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { reset(); onClose(); }} />
        <View style={[styles.modalSheet, {
          paddingBottom: kbHeight > 0 ? s(32) : insets.bottom + s(16),
          marginBottom: kbHeight > 0 ? kbHeight + s(12) : 0,
        }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{isEditing ? 'Edit Activity' : 'Add Activity'}</Text>

          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: s(14) }}
            contentContainerStyle={{ gap: s(8) }}>
            {CATEGORIES.map(c => {
              const active = category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.catChip, active && styles.catChipActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Ionicons name={c.icon} size={s(15)} color={active ? Colors.white : Colors.grayMedium} />
                  <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.fieldLabel}>Time</Text>
          <View style={styles.timeRow}>
            <TextInput
              style={styles.timeInput}
              value={hour}
              onChangeText={v => setHour(v.replace(/[^0-9]/g, '').slice(0, 2))}
              placeholder="08"
              placeholderTextColor={Colors.grayMedium}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.timeColon}>:</Text>
            <TextInput
              style={styles.timeInput}
              value={minute}
              onChangeText={v => setMinute(v.replace(/[^0-9]/g, '').slice(0, 2))}
              placeholder="00"
              placeholderTextColor={Colors.grayMedium}
              keyboardType="number-pad"
              maxLength={2}
            />
            <View style={styles.periodToggle}>
              <TouchableOpacity
                style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]}
                onPress={() => setPeriod('AM')}
              >
                <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]}
                onPress={() => setPeriod('PM')}
              >
                <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput style={styles.modalInput} value={title} onChangeText={setTitle}
            placeholder="e.g. Ferry to Coron Island" placeholderTextColor={Colors.grayMedium} maxLength={60} />

          <Text style={styles.fieldLabel}>Description (optional)</Text>
          <TextInput style={styles.modalInput} value={subtitle} onChangeText={setSubtitle}
            placeholder="e.g. OceanJet Ferry" placeholderTextColor={Colors.grayMedium} maxLength={60} />

          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.modalInput, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Bring printed tickets, confirm booking ahead"
            placeholderTextColor={Colors.grayMedium}
            multiline
            maxLength={300}
          />

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Activity'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const MAX_PHOTOS = 3;

function ActivityCard({ activity, isLast, onEdit, onDelete, onToggleDone, onPhotoUpdate, onNotesUpdate, onLocationUpdate, drag, isActive, dragEnabled }) {
  const done = !!activity.done;
  const photos = (() => {
    try { return JSON.parse(activity.photo_uri || '[]'); } catch { return []; }
  })();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(activity.notes || '');
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationText, setLocationText] = useState(activity.location || '');

  const handleAddPhoto = () => {
    Alert.alert('Add Photo', 'Choose a source', [
      {
        text: 'Take Photo',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Allow camera access to take photos.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.85 });
            if (!result.canceled && result.assets?.[0]?.uri) {
              onPhotoUpdate([...photos, result.assets[0].uri]);
            }
          } catch (e) { Alert.alert('Error', e?.message || 'Could not open camera.'); }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Allow photo access to attach images.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.85 });
            if (!result.canceled && result.assets?.[0]?.uri) {
              onPhotoUpdate([...photos, result.assets[0].uri]);
            }
          } catch (e) { Alert.alert('Error', e?.message || 'Could not open gallery.'); }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRemovePhoto = (index) => {
    Alert.alert('Remove Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        const updated = photos.filter((_, i) => i !== index);
        onPhotoUpdate(updated);
      }},
    ]);
  };

  const cardContent = (
    <View style={[styles.activityRow, isActive && styles.activityRowActive]}>
      <View style={styles.timeCol}>
        <Text style={[styles.timeText, done && styles.timeTextDone]}>{activity.time.replace(' ', '\n')}</Text>
      </View>
      <View style={styles.timelineCol}>
        <View style={[styles.dot, done && styles.dotDone]} />
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={[styles.card, done && styles.cardDone, isActive && styles.cardDragging]}>
        {/* Row 1: edit / delete / drag handle */}
        <View style={styles.cardActionRow}>
          <TouchableOpacity style={styles.editChip} onPress={onEdit} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={s(11)} color={Colors.primary} />
            <Text style={styles.editChipText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteChip}
            onPress={() => Alert.alert('Delete Activity', `Delete "${activity.title}"?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: onDelete },
            ])}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={s(11)} color="#b91c1c" />
            <Text style={styles.deleteChipText}>Delete</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onLongPress={dragEnabled ? drag : undefined}
            delayLongPress={150}
            style={[styles.dragHandle, isActive && styles.dragHandleActive, !dragEnabled && styles.dragHandleDisabled]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={!dragEnabled}
          >
            <Ionicons name="menu-outline" size={s(18)} color={isActive ? '#ef4444' : Colors.grayMedium} />
          </TouchableOpacity>
        </View>

        {/* Row 2: mark done */}
        <TouchableOpacity onPress={onToggleDone} style={[styles.doneBtn, done && styles.doneBtnActive]} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          {done ? (
            <View style={styles.doneCircleFilled}>
              <Ionicons name="checkmark" size={s(7)} color={Colors.white} />
            </View>
          ) : (
            <View style={styles.doneCircleEmpty} />
          )}
          <Text style={[styles.doneBtnLabel, done && styles.doneBtnLabelActive]}>
            {done ? 'Done' : 'Mark done'}
          </Text>
        </TouchableOpacity>

        <View style={styles.cardTopRow}>
          <ActivityIconView category={activity.category} />
          <View style={styles.cardBody}>
            <Text style={[styles.cardTitle, done && styles.cardTitleDone]}>{activity.title}</Text>
            {!!activity.subtitle && <Text style={[styles.cardSub, done && styles.cardSubDone]}>{activity.subtitle}</Text>}
          </View>
        </View>

        <View style={styles.cardBottomContainer}>
          {/* Photo row */}
          <View style={styles.photoRow}>
            {photos.map((uri, i) => (
              <TouchableOpacity key={i} onLongPress={() => handleRemovePhoto(i)} activeOpacity={0.85}>
                <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
              </TouchableOpacity>
            ))}
            {photos.length < MAX_PHOTOS && (
              <Pressable style={styles.photoPlaceholder} onPress={handleAddPhoto}>
                <Ionicons name="camera-outline" size={s(16)} color={Colors.grayMedium} />
                <Text style={styles.photoPlaceholderText}>Add photo</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.cardFooter}>
            <TouchableOpacity
              onPress={() => { setNotesText(activity.notes || ''); setEditingNotes(true); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.notesRowText, !notesText && styles.notesRowPlaceholder]} numberOfLines={2}>
                {notesText || 'Add a note…'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.locationLabel, locationText && styles.locationLabelFilled]}
              onPress={() => { setLocationText(activity.location || ''); setEditingLocation(true); }}
              activeOpacity={0.7}
            >
              <Ionicons name="location-outline" size={s(11)} color={locationText ? Colors.primary : Colors.grayMedium} />
              <Text style={[styles.locationLabelText, locationText && styles.locationLabelTextFilled]} numberOfLines={1}>
                {locationText || 'Add location'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <>
      {dragEnabled && ScaleDecorator ? <ScaleDecorator activeScale={1.02}>{cardContent}</ScaleDecorator> : cardContent}

        {/* Notes edit modal */}
        <Modal visible={editingNotes} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setEditingNotes(false)}>
          <TouchableOpacity style={styles.notesOverlay} activeOpacity={1} onPress={() => setEditingNotes(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.notesModal} onPress={() => {}}>
              <Text style={styles.notesModalTitle}>Notes</Text>
              <TextInput
                style={styles.notesModalInput}
                value={notesText}
                onChangeText={setNotesText}
                placeholder="e.g. Bring printed tickets, confirm booking ahead"
                placeholderTextColor={Colors.grayMedium}
                multiline
                autoFocus
                maxLength={300}
              />
              <View style={styles.notesModalActions}>
                <TouchableOpacity onPress={() => setEditingNotes(false)} style={styles.notesCancelBtn}>
                  <Text style={styles.notesCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.notesSaveBtn}
                  onPress={() => { onNotesUpdate(notesText.trim()); setEditingNotes(false); }}
                >
                  <Text style={styles.notesSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Location edit modal */}
        <Modal visible={editingLocation} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setEditingLocation(false)}>
          <TouchableOpacity style={styles.notesOverlay} activeOpacity={1} onPress={() => setEditingLocation(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.notesModal} onPress={() => {}}>
              <Text style={styles.notesModalTitle}>Location</Text>
              <TextInput
                style={styles.notesModalInput}
                value={locationText}
                onChangeText={setLocationText}
                placeholder="e.g. Coron Town Port, Palawan"
                placeholderTextColor={Colors.grayMedium}
                autoFocus
                maxLength={120}
              />
              <View style={styles.notesModalActions}>
                <TouchableOpacity onPress={() => setEditingLocation(false)} style={styles.notesCancelBtn}>
                  <Text style={styles.notesCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.notesSaveBtn}
                  onPress={() => { onLocationUpdate(locationText.trim()); setEditingLocation(false); }}
                >
                  <Text style={styles.notesSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
    </>
  );
}

function MemoryViewer({ photo, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying]           = useState(false);
  const flatListRef = useRef(null);
  const timerRef    = useRef(null);

  const allPhotos = photo?.allPhotos || [];
  const current   = allPhotos[currentIndex] || photo;

  useEffect(() => {
    if (photo) {
      const idx = photo.index ?? 0;
      setCurrentIndex(idx);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: idx, animated: false });
      }, 50);
    }
  }, [photo]);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setCurrentIndex(i => {
          if (i >= allPhotos.length - 1) { setPlaying(false); return i; }
          const next = i + 1;
          flatListRef.current?.scrollToIndex({ index: next, animated: true });
          return next;
        });
      }, 2500);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, allPhotos.length]);

  const handleShare = async () => {
    if (!current?.uri) return;
    try {
      await Share.share({ url: current.uri, message: `${current.title} — Day ${current.day}` });
    } catch {}
  };

  if (!photo) return null;

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={mem.viewer}>

        {/* Top bar */}
        <View style={mem.viewerTopBar}>
          <TouchableOpacity style={mem.viewerIconBtn} onPress={onClose}>
            <Ionicons name="close" size={s(22)} color="#fff" />
          </TouchableOpacity>
          <Text style={mem.viewerCounter}>{currentIndex + 1} / {allPhotos.length}</Text>
          <TouchableOpacity style={mem.viewerIconBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={s(22)} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Swipeable photos */}
        <FlatList
          ref={flatListRef}
          data={allPhotos}
          horizontal
          pagingEnabled
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          initialScrollIndex={photo.index ?? 0}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
            setPlaying(false);
          }}
          renderItem={({ item }) => (
            <View style={{ width, height: screenHeight, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
              <Image source={{ uri: item.uri }} style={{ width, height: screenHeight }} resizeMode="contain" />
            </View>
          )}
        />

        {/* Caption */}
        <View style={mem.viewerCaption}>
          <Text style={mem.viewerTitle}>{current?.title}</Text>
          <Text style={mem.viewerDay}>Day {current?.day}</Text>
        </View>

        {/* Play/pause */}
        <View style={mem.viewerControls}>
          <TouchableOpacity style={mem.viewerPlayBtn} onPress={() => setPlaying(p => !p)}>
            <Ionicons name={playing ? 'pause' : 'play'} size={s(22)} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Progress dots */}
        {allPhotos.length > 1 && (
          <View style={mem.dots}>
            {allPhotos.map((_, i) => (
              <View key={i} style={[mem.dot, i === currentIndex && mem.dotActive]} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

export default function TripDetailsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const trip = route?.params?.trip;
  const [selectedDay, setSelectedDay] = useState(0);
  const [activities, setActivities] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [dayLabel, setDayLabelState] = useState('');
  const [editingDayLabel, setEditingDayLabel] = useState(false);
  const [dayLabelDraft, setDayLabelDraft] = useState('');
  const [allActivities, setAllActivities] = useState([]);
  const [undoSnack, setUndoSnack] = useState(null); // { message, onUndo }
  const undoTimerRef = useRef(null);
  const swipeableRefs = useRef({});
  const [activeView, setActiveView] = useState('itinerary'); // 'itinerary' | 'packing' | 'memories'
  const [viewingPhoto, setViewingPhoto] = useState(null); // { uri, title, day }
  const [packingItems, setPackingItems] = useState([]);
  const [newPackingItem, setNewPackingItem] = useState('');
  const [addingPackingItem, setAddingPackingItem] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [memoryHeroIndex, setMemoryHeroIndex] = useState(0);
  const [memoryAutoPlay, setMemoryAutoPlay] = useState(true);

  const days = trip?.days || 1;
  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1);

  const totalActivities = allActivities.length;
  const doneActivities = allActivities.filter(a => a.done).length;
  const completionPct = totalActivities > 0 ? Math.round((doneActivities / totalActivities) * 100) : 0;
  const allPhotos = useMemo(() => allActivities.flatMap((a) => {
    const uris = (() => { try { return JSON.parse(a.photo_uri || '[]'); } catch { return []; } })();
    return uris.map((uri) => ({ uri, title: a.title, day: a.day }));
  }), [allActivities]);

  const loadActivities = useCallback(async () => {
    if (!trip?.id) return;
    const data = await getTripActivities(trip.id, selectedDay + 1);
    setActivities(data);
  }, [trip?.id, selectedDay]);

  const loadDayLabel = useCallback(async () => {
    if (!trip?.id) return;
    const label = await getDayLabel(trip.id, selectedDay + 1);
    setDayLabelState(label);
  }, [trip?.id, selectedDay]);

  const loadAllActivities = useCallback(async () => {
    if (!trip?.id) return;
    const data = await getAllTripActivities(trip.id);
    setAllActivities(data);
  }, [trip?.id]);

  const loadPackingItems = useCallback(async () => {
    if (!trip?.id) return;
    const data = await getPackingItems(trip.id);
    setPackingItems(data);
  }, [trip?.id]);

  const handleAddPackingItem = async () => {
    if (!newPackingItem.trim()) return;
    await addPackingItem(trip.id, newPackingItem);
    setNewPackingItem('');
    setAddingPackingItem(false);
    loadPackingItems();
  };

  const showUndo = (message, onUndo) => {
    clearTimeout(undoTimerRef.current);
    setUndoSnack({ message, onUndo });
    undoTimerRef.current = setTimeout(() => setUndoSnack(null), 3500);
  };

  const handleTogglePackingItem = async (item) => {
    await togglePackingItem(item.id, !item.checked);
    loadPackingItems();
  };

  const handleSwipeDone = async (item) => {
    const wasChecked = !!item.checked;
    await togglePackingItem(item.id, !wasChecked);
    loadPackingItems();
    showUndo(wasChecked ? 'Marked undone' : 'Marked as done', async () => {
      await togglePackingItem(item.id, wasChecked);
      loadPackingItems();
    });
  };

  const handleSwipeDelete = async (item) => {
    const wasChecked = !!item.checked;
    await deletePackingItem(item.id);
    loadPackingItems();
    showUndo(`"${item.item}" removed`, async () => {
      await addPackingItem(trip.id, item.item, wasChecked);
      loadPackingItems();
    });
  };

  const handleDeletePackingItem = (id) => {
    Alert.alert('Remove Item', 'Remove this item from your packing list?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deletePackingItem(id); loadPackingItems(); } },
    ]);
  };

  const saveDayLabel = async () => {
    await setDayLabel(trip.id, selectedDay + 1, dayLabelDraft.trim());
    setDayLabelState(dayLabelDraft.trim());
    setEditingDayLabel(false);
  };

  useFocusEffect(useCallback(() => { loadActivities(); loadDayLabel(); loadAllActivities(); loadPackingItems(); }, [loadActivities, loadDayLabel, loadAllActivities, loadPackingItems]));

  const handleDeleteActivity = async (id) => {
    await deleteTripActivity(id);
    loadActivities();
    loadAllActivities();
  };

  const handleDragEnd = async ({ data }) => {
    setActivities(data);
    await reorderActivities(data.map((item) => item.id));
  };


  const handleToggleDone = async (activity) => {
    await toggleActivityDone(activity.id, !activity.done);
    Haptics.impactAsync(!activity.done ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    loadActivities();
    loadAllActivities();
  };

  const handlePhotoUpdate = async (id, photos) => {
    await updateActivityPhotos(id, photos);
    loadActivities();
  };

  const handleNotesUpdate = async (id, notes) => {
    await updateActivityNotes(id, notes);
    loadActivities();
  };

  const handleLocationUpdate = async (id, location) => {
    await updateActivityLocation(id, location);
    loadActivities();
  };

  const handleSavedActivity = () => {
    setEditingActivity(null);
    loadActivities();
    loadAllActivities();
  };

  useEffect(() => {
    if (allPhotos.length === 0) {
      setMemoryHeroIndex(0);
      return;
    }

    if (memoryHeroIndex > allPhotos.length - 1) {
      setMemoryHeroIndex(0);
    }
  }, [allPhotos, memoryHeroIndex]);

  useEffect(() => {
    if (activeView !== 'memories' || !memoryAutoPlay || allPhotos.length <= 1) return undefined;

    const timer = setInterval(() => {
      setMemoryHeroIndex((current) => (current + 1) % allPhotos.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [activeView, memoryAutoPlay, allPhotos.length]);


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + s(10) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={s(22)} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{trip?.name || 'Trip'}</Text>
          {!!trip?.dates && <Text style={styles.headerSub}>{trip.dates}</Text>}
        </View>
        <TouchableOpacity style={styles.headerBtn}
          onPress={() => navigation.navigate('Main', { screen: 'Discover' })}>
          <Ionicons name="compass-outline" size={s(22)} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={s(24)} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.progressStrip}>
        <View style={styles.progressStripHeader}>
          <Text style={styles.progressStripLabel}>
            Day {selectedDay + 1} {activeView === 'itinerary' ? 'itinerary' : activeView}
          </Text>
          <Text style={[styles.progressStripValue, completionPct === 100 && styles.progressStripValueComplete]}>
            {doneActivities} of {totalActivities} done
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${completionPct}%` }, completionPct === 100 && styles.progressBarComplete]} />
        </View>
      </View>

      {/* View switcher — segmented control */}
      <View style={styles.viewSwitcher}>
        <View style={styles.segmentTrack}>
          {['itinerary', 'packing', 'memories'].map((view) => {
            const active = activeView === view;
            const label = view === 'itinerary' ? 'Itinerary' : view === 'packing' ? 'Packing' : 'Memories';
            const icon  = view === 'itinerary' ? 'calendar-outline' : view === 'packing' ? 'bag-outline' : 'images-outline';
            return (
              <TouchableOpacity
                key={view}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                onPress={() => setActiveView(view)}
                activeOpacity={0.85}
              >
                <Ionicons name={icon} size={s(13)} color={active ? Colors.primary : 'rgba(255,255,255,0.75)'} />
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{label}</Text>
                {view === 'packing' && packingItems.filter(i => !i.checked).length > 0 && (
                  <View style={styles.packingBadge}>
                    <Text style={styles.packingBadgeText}>{packingItems.filter(i => !i.checked).length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {activeView === 'itinerary' ? (
        <>
          {/* Day tabs */}
          <View style={styles.tabBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
              {dayNumbers.map((d, index) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.tab, selectedDay === index && styles.tabActive]}
                  onPress={() => setSelectedDay(index)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.tabLabel, selectedDay === index && styles.tabLabelActive]}>Day {d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

      {/* Day label edit modal */}
      <Modal visible={editingDayLabel} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setEditingDayLabel(false)}>
        <TouchableOpacity style={styles.notesOverlay} activeOpacity={1} onPress={() => setEditingDayLabel(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.notesModal} onPress={() => {}}>
            <Text style={styles.notesModalTitle}>Day {selectedDay + 1} Label</Text>
            <TextInput
              style={styles.notesModalInput}
              value={dayLabelDraft}
              onChangeText={setDayLabelDraft}
              placeholder={`e.g. "Travel Day", "Baguio City"`}
              placeholderTextColor={Colors.grayMedium}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveDayLabel}
            />
            <View style={styles.notesModalActions}>
              <TouchableOpacity style={styles.notesCancelBtn} onPress={() => setEditingDayLabel(false)}>
                <Text style={styles.notesCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.notesSaveBtn} onPress={saveDayLabel}>
                <Text style={styles.notesSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

          {/* Day label */}
          <TouchableOpacity
            style={styles.dayLabelRow}
            onPress={() => { setDayLabelDraft(dayLabel); setEditingDayLabel(true); }}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={s(12)} color={dayLabel ? Colors.primary : Colors.grayMedium} />
            <Text style={[styles.dayLabelText, !dayLabel && styles.dayLabelPlaceholder]}>
              {dayLabel || `Name this day… e.g. "Travel to Baguio"`}
            </Text>
          </TouchableOpacity>

          {/* Activities */}
          {activities.length === 0 ? (
            <View style={styles.emptyDay}>
              <Ionicons name="calendar-outline" size={s(40)} color={Colors.grayMedium} />
              <Text style={styles.emptyDayText}>No activities for Day {selectedDay + 1}</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowAddModal(true)}>
                <Text style={styles.emptyAddBtnText}>+ Add Activity</Text>
              </TouchableOpacity>
            </View>
          ) : isExpoGo || !DraggableFlatList ? (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.activitiesList, { paddingBottom: s(20) }]}>
              {activities.map((activity, i) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  isLast={i === activities.length - 1}
                  onEdit={() => setEditingActivity(activity)}
                  onDelete={() => handleDeleteActivity(activity.id)}
                  onToggleDone={() => handleToggleDone(activity)}
                  onPhotoUpdate={(uris) => handlePhotoUpdate(activity.id, uris)}
                  onNotesUpdate={(notes) => handleNotesUpdate(activity.id, notes)}
                  onLocationUpdate={(loc) => handleLocationUpdate(activity.id, loc)}
                  dragEnabled={false}
                />
              ))}
            </ScrollView>
          ) : (
            <DraggableFlatList
              data={activities}
              keyExtractor={(item) => String(item.id)}
              onDragEnd={handleDragEnd}
              renderItem={({ item, drag, isActive, getIndex }) => (
                <ActivityCard
                  activity={item}
                  isLast={(getIndex?.() ?? 0) === activities.length - 1}
                  onEdit={() => setEditingActivity(item)}
                  onDelete={() => handleDeleteActivity(item.id)}
                  onToggleDone={() => handleToggleDone(item)}
                  onPhotoUpdate={(uris) => handlePhotoUpdate(item.id, uris)}
                  onNotesUpdate={(notes) => handleNotesUpdate(item.id, notes)}
                  onLocationUpdate={(loc) => handleLocationUpdate(item.id, loc)}
                  drag={drag}
                  isActive={isActive}
                  dragEnabled
                />
              )}
              activationDistance={12}
              autoscrollThreshold={60}
              containerStyle={styles.activitiesDraggableList}
              contentContainerStyle={[styles.activitiesList, { paddingBottom: s(20) }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </>
      ) : activeView === 'packing' ? (
        /* Packing List */
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.packingScroll}>
          {/* Add item row */}
          {addingPackingItem ? (
            <View style={styles.packingAddRow}>
              <TextInput
                style={styles.packingInput}
                value={newPackingItem}
                onChangeText={setNewPackingItem}
                placeholder="e.g. Passport, Sunscreen, Charger"
                placeholderTextColor={Colors.grayMedium}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddPackingItem}
              />
              <TouchableOpacity style={styles.packingAddBtn} onPress={handleAddPackingItem}>
                <Text style={styles.packingAddBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setAddingPackingItem(false); setNewPackingItem(''); }} style={styles.packingCancelBtn}>
                <Ionicons name="close" size={s(18)} color={Colors.grayMedium} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.packingNewBtn} onPress={() => setAddingPackingItem(true)}>
              <Ionicons name="add-circle-outline" size={s(18)} color={Colors.primary} />
              <Text style={styles.packingNewBtnText}>Add item</Text>
            </TouchableOpacity>
          )}

          {packingItems.length === 0 && !addingPackingItem ? (
            <View style={styles.packingEmpty}>
              <Ionicons name="bag-outline" size={s(40)} color={Colors.grayMedium} />
              <Text style={styles.packingEmptyText}>No items yet</Text>
              <Text style={styles.packingEmptySubText}>Add things you need to pack for this trip</Text>
            </View>
          ) : (
            <View style={styles.packingList}>
              {packingItems.map(item => (
                <Swipeable
                  key={`${item.id}-${item.checked}`}
                  ref={r => { swipeableRefs.current[item.id] = r; }}
                  overshootRight={false}
                  overshootLeft={false}
                  friction={2}
                  onSwipeableWillOpen={(dir) => {
                    if (dir === 'left') handleSwipeDone(item);
                    else handleSwipeDelete(item);
                  }}
                  renderLeftActions={() => (
                    <View style={styles.swipeActionDone}>
                      <Ionicons name={item.checked ? 'close-circle' : 'checkmark-circle'} size={s(22)} color="#fff" />
                      <Text style={styles.swipeActionText}>{item.checked ? 'Undo' : 'Done'}</Text>
                    </View>
                  )}
                  renderRightActions={() => (
                    <View style={styles.swipeActionDelete}>
                      <Ionicons name="trash-outline" size={s(22)} color="#fff" />
                      <Text style={styles.swipeActionText}>Delete</Text>
                    </View>
                  )}
                >
                  <TouchableOpacity
                    style={styles.packingItem}
                    onPress={() => handleTogglePackingItem(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.packingCheck, item.checked && styles.packingCheckDone]}>
                      {!!item.checked && <Ionicons name="checkmark" size={s(12)} color={Colors.white} />}
                    </View>
                    <Text style={[styles.packingItemText, item.checked && styles.packingItemTextDone]}>
                      {item.item}
                    </Text>
                  </TouchableOpacity>
                </Swipeable>
              ))}
            </View>
          )}
        </ScrollView>
      ) : null}

      {activeView === 'memories' && (() => {
        const heroPhoto = allPhotos[memoryHeroIndex] || null;

        return (
          <ScrollView contentContainerStyle={mem.scrollContent} showsVerticalScrollIndicator={false}>
            {allPhotos.length === 0 ? (
              <View style={mem.empty}>
                <Ionicons name="images-outline" size={s(48)} color={Colors.grayMedium} />
                <Text style={mem.emptyTitle}>No memories yet</Text>
                <Text style={mem.emptyText}>Photos you attach to activities will appear here.</Text>
                <TouchableOpacity style={mem.emptyHint} onPress={() => setActiveView('itinerary')}>
                  <Ionicons name="calendar-outline" size={s(13)} color={Colors.primary} />
                  <Text style={mem.emptyHintText}>Go to Itinerary to add photos</Text>
                  <Ionicons name="arrow-forward" size={s(13)} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={mem.headerRow}>
                  <View>
                    <Text style={mem.eyebrow}>Trip Memories</Text>
                    <Text style={mem.count}>{allPhotos.length} photo{allPhotos.length !== 1 ? 's' : ''}</Text>
                  </View>
                  {allPhotos.length > 1 && (
                    <TouchableOpacity
                      style={[mem.autoPlayChip, !memoryAutoPlay && mem.autoPlayChipPaused]}
                      onPress={() => setMemoryAutoPlay((prev) => !prev)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={memoryAutoPlay ? 'pause-outline' : 'play-outline'}
                        size={s(12)}
                        color={memoryAutoPlay ? Colors.primary : Colors.grayMedium}
                      />
                      <Text style={[mem.autoPlayChipText, !memoryAutoPlay && mem.autoPlayChipTextPaused]}>
                        {memoryAutoPlay ? 'Auto' : 'Paused'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {heroPhoto && (
                  <TouchableOpacity
                    style={mem.heroCard}
                    activeOpacity={0.92}
                    onPress={() => setViewingPhoto({ ...heroPhoto, index: memoryHeroIndex, allPhotos })}
                    onLongPress={() => setMemoryAutoPlay(false)}
                  >
                    <Image source={{ uri: heroPhoto.uri }} style={mem.heroImage} resizeMode="cover" />
                    <View style={mem.heroOverlay} />
                    <View style={mem.heroContent}>
                      <Text style={mem.heroLabel}>Memory spotlight</Text>
                      <Text style={mem.heroTitle} numberOfLines={2}>{heroPhoto.title}</Text>
                      <Text style={mem.heroMeta}>Day {heroPhoto.day}</Text>
                    </View>
                    {allPhotos.length > 1 && (
                      <View style={mem.heroDots}>
                        {allPhotos.map((_, index) => (
                          <View key={index} style={[mem.heroDot, index === memoryHeroIndex && mem.heroDotActive]} />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                <View style={mem.gridHeader}>
                  <Text style={mem.gridTitle}>More moments</Text>
                  <Text style={mem.gridHint}>Tap a photo to feature it above</Text>
                </View>

                <View style={mem.grid}>
                  {allPhotos.map((photo, i) => (
                    <TouchableOpacity
                      key={i}
                      style={mem.thumbCard}
                      onPress={() => {
                        setMemoryHeroIndex(i);
                        setMemoryAutoPlay(false);
                      }}
                      onLongPress={() => setViewingPhoto({ ...photo, index: i, allPhotos })}
                      activeOpacity={0.88}
                    >
                      <Image source={{ uri: photo.uri }} style={mem.thumbImage} resizeMode="cover" />
                      <View style={mem.thumbOverlay} />
                      {i === memoryHeroIndex && <View style={mem.thumbActiveRing} />}
                      <Text style={mem.thumbDay}>Day {photo.day}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        );
      })()}

      {/* Full-screen photo viewer with autoplay + share */}
      <MemoryViewer photo={viewingPhoto} onClose={() => setViewingPhoto(null)} />

      <AddActivityModal
        visible={showAddModal}
        tripId={trip?.id}
        day={selectedDay + 1}
        onClose={() => setShowAddModal(false)}
        onSaved={() => { loadActivities(); loadAllActivities(); }}
      />
      <AddActivityModal
        visible={!!editingActivity}
        tripId={trip?.id}
        day={selectedDay + 1}
        activity={editingActivity}
        onClose={() => setEditingActivity(null)}
        onSaved={handleSavedActivity}
      />

      {/* Undo snackbar */}
      {undoSnack && (
        <View style={[styles.snackbar, { bottom: insets.bottom + s(16) }]}>
          <Text style={styles.snackbarText}>{undoSnack.message}</Text>
          <TouchableOpacity
            onPress={() => { undoSnack.onUndo(); setUndoSnack(null); clearTimeout(undoTimerRef.current); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.snackbarUndo}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgLight },
  snackbar: {
    position: 'absolute', left: s(16), right: s(16),
    backgroundColor: '#1c1c1e', borderRadius: s(12),
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: s(16), paddingVertical: s(13),
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  snackbarText: { fontSize: s(13), fontFamily: Fonts.medium, color: '#fff', flex: 1 },
  snackbarUndo: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.accent, marginLeft: s(12) },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: s(16), paddingBottom: s(14),
  },
  headerBtn: { width: s(36), height: s(36), alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: s(17), fontFamily: Fonts.bold, color: Colors.white },
  headerSub: { fontSize: s(11), fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.75)', marginTop: s(2) },
  progressStrip: {
    backgroundColor: Colors.white,
    paddingTop: s(10),
    paddingBottom: s(12),
    paddingHorizontal: s(16),
    gap: s(8),
  },
  progressStripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: s(12),
  },
  progressStripLabel: {
    flex: 1,
    fontSize: s(12),
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  progressStripValue: {
    fontSize: s(12),
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  progressStripValueComplete: {
    color: '#22c55e',
  },
  progressBarTrack: {
    width: '100%', height: s(6), borderRadius: s(3),
    backgroundColor: Colors.grayLight, overflow: 'hidden',
  },
  progressBarFill: {
    height: s(6), borderRadius: s(3), backgroundColor: Colors.primary,
  },
  progressBarComplete: { backgroundColor: '#22c55e' },
  tabBar: { backgroundColor: Colors.white },
  tabContent: { paddingHorizontal: s(12), paddingVertical: s(10), gap: s(8) },
  tab: {
    paddingHorizontal: s(18), paddingVertical: s(8),
    borderRadius: s(20), backgroundColor: Colors.grayLight, minWidth: s(68), alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.primary },
  tabLabel: { fontSize: s(12), fontFamily: Fonts.bold, color: Colors.textSecondary },
  tabLabelActive: { color: Colors.white },
  dayLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: s(6),
    paddingHorizontal: s(16), paddingVertical: s(10),
    backgroundColor: Colors.white,
  },
  dayLabelText: { fontSize: s(12), fontFamily: Fonts.medium, color: Colors.primary, flex: 1 },
  dayLabelPlaceholder: { color: Colors.grayMedium, fontFamily: Fonts.regular },
  scrollContent: {},
  activitiesDraggableList: { flex: 1 },
  activitiesList: { paddingHorizontal: s(16), paddingTop: s(16) },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: s(10) },
  activityRowActive: { zIndex: 2 },
  timeCol: { width: s(52), paddingTop: s(10) },
  timeText: { fontSize: s(10), fontFamily: Fonts.medium, color: Colors.textSecondary, lineHeight: s(14) },
  timelineCol: { width: s(20), alignItems: 'center', paddingTop: s(13) },
  dot: { width: s(10), height: s(10), borderRadius: s(5), backgroundColor: Colors.primary },
  line: { width: s(2), flex: 1, minHeight: s(48), backgroundColor: Colors.border, marginTop: s(4) },
  card: {
    flex: 1, flexDirection: 'column',
    backgroundColor: Colors.white, borderRadius: s(14),
    marginLeft: s(10), padding: s(10), paddingBottom: s(12),
    shadowColor: '#000', shadowOffset: { width: 0, height: s(2) },
    shadowOpacity: 0.06, shadowRadius: s(6), elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row', alignItems: 'center', gap: s(10),
  },
  cardIconBox: {
    width: s(44), height: s(44), borderRadius: s(10),
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },

  cardBody: { flex: 1 },
  photoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: s(3),
    backgroundColor: Colors.primaryBg, borderRadius: s(8),
    paddingHorizontal: s(6), paddingVertical: s(3),
  },
  photoBadgeText: { fontSize: s(10), fontFamily: Fonts.bold, color: Colors.primary },
  cardTitle: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.textPrimary },
  cardTitleDone: { color: Colors.textTertiary, textDecorationLine: 'line-through' },
  cardSub: { fontSize: s(11), fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: s(2) },
  cardSubDone: { color: Colors.textTertiary },
  cardDone: { opacity: 0.7 },
  cardDragging: {
    shadowOpacity: 0.12,
    shadowRadius: s(10),
    elevation: 6,
  },
  dragHandle: {
    paddingLeft: s(6),
    paddingVertical: s(6),
    alignSelf: 'flex-start',
  },
  dragHandleActive: { opacity: 1 },
  dragHandleDisabled: { opacity: 0.35 },
  timeTextDone: { color: Colors.textTertiary },
  dotDone: { backgroundColor: Colors.textTertiary },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: s(3),
    paddingHorizontal: s(6), paddingVertical: s(2),
    borderRadius: s(20), alignSelf: 'flex-start',
    backgroundColor: Colors.bgLight,
    borderWidth: 1, borderColor: Colors.border,
    transform: [{ skewX: '-8deg' }],
    marginBottom: s(6),
  },
  doneBtnActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primary,
  },
  doneBtnLabel: { fontSize: s(9), fontFamily: Fonts.bold, color: Colors.grayMedium, transform: [{ skewX: '8deg' }] },
  doneBtnLabelActive: { color: Colors.primary },
  doneCircleEmpty: {
    width: s(11), height: s(11), borderRadius: s(6),
    borderWidth: 1.5, borderColor: '#C7C7CC',
    transform: [{ skewX: '8deg' }],
  },
  doneCircleFilled: {
    width: s(11), height: s(11), borderRadius: s(6),
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    transform: [{ skewX: '8deg' }],
  },
  cardBottomContainer: {
    marginTop: s(10),
    backgroundColor: Colors.primaryBg,
    borderRadius: s(10),
    padding: s(10),
    gap: s(0),
  },
  photoRow: {
    flexDirection: 'row', gap: s(6),
  },
  photoThumb: {
    width: PHOTO_SIZE, height: PHOTO_SIZE,
    borderRadius: s(8),
  },
  photoPlaceholder: {
    width: PHOTO_SIZE, height: PHOTO_SIZE,
    borderRadius: s(8),
    borderWidth: 1.5, borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.bgLight,
    alignItems: 'center', justifyContent: 'center',
    gap: s(3),
  },
  photoPlaceholderText: {
    fontSize: s(10), fontFamily: Fonts.medium, color: Colors.grayMedium,
  },
  emptyDay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: s(10), paddingTop: s(80) },
  emptyDayText: { fontSize: s(14), fontFamily: Fonts.regular, color: Colors.textSecondary },
  emptyAddBtn: { marginTop: s(4) },
  emptyAddBtnText: { fontSize: s(14), fontFamily: Fonts.bold, color: Colors.primary },
  viewSwitcher: {
    backgroundColor: Colors.white,
    paddingHorizontal: s(16), paddingVertical: s(10),
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: s(10),
    padding: s(3),
  },
  segmentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: s(4), paddingVertical: s(7),
    borderRadius: s(8),
  },
  segmentBtnActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  segmentLabel: { fontSize: s(12), fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.85)' },
  segmentLabelActive: { color: Colors.primary },
  packingBadge: {
    minWidth: s(16), height: s(16), borderRadius: s(8),
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: s(3),
  },
  packingBadgeText: { fontSize: s(10), fontFamily: Fonts.bold, color: Colors.primary },
  packingScroll: { padding: s(16), paddingBottom: s(40) },
  packingNewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: s(8),
    padding: s(14), backgroundColor: Colors.white,
    borderRadius: s(12), marginBottom: s(12),
    borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed',
  },
  packingNewBtnText: { fontSize: s(14), fontFamily: Fonts.medium, color: Colors.primary },
  packingAddRow: {
    flexDirection: 'row', alignItems: 'center', gap: s(8),
    backgroundColor: Colors.white, borderRadius: s(12),
    padding: s(10), marginBottom: s(12),
    borderWidth: 1, borderColor: Colors.primary,
  },
  packingInput: { flex: 1, fontSize: s(14), fontFamily: Fonts.regular, color: Colors.textPrimary, padding: 0 },
  packingAddBtn: {
    paddingHorizontal: s(12), paddingVertical: s(6),
    backgroundColor: Colors.primary, borderRadius: s(8),
  },
  packingAddBtnText: { fontSize: s(12), fontFamily: Fonts.bold, color: Colors.white },
  packingCancelBtn: { padding: s(4) },
  packingEmpty: { alignItems: 'center', gap: s(8), paddingTop: s(60) },
  packingEmptyText: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.textSecondary },
  packingEmptySubText: { fontSize: s(12), fontFamily: Fonts.regular, color: Colors.grayMedium, textAlign: 'center' },
  packingList: { gap: s(8) },
  swipeActionDone: {
    backgroundColor: Colors.primary, borderRadius: s(12),
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: s(20), marginBottom: s(0), gap: s(4),
  },
  swipeActionDelete: {
    backgroundColor: '#ef4444', borderRadius: s(12),
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: s(20), gap: s(4),
  },
  swipeActionText: { fontSize: s(11), fontFamily: Fonts.bold, color: '#fff' },
  packingItem: {
    flexDirection: 'row', alignItems: 'center', gap: s(12),
    backgroundColor: Colors.white, borderRadius: s(12),
    padding: s(14),
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: s(4), elevation: 1,
  },
  packingCheck: {
    width: s(22), height: s(22), borderRadius: s(11),
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  packingCheckDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  packingItemText: { flex: 1, fontSize: s(14), fontFamily: Fonts.regular, color: Colors.textPrimary },
  packingItemTextDone: { color: Colors.grayMedium, textDecorationLine: 'line-through' },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: s(24), borderTopRightRadius: s(24),
    padding: s(24), paddingTop: s(12),
  },
  modalHandle: {
    width: s(40), height: s(4), borderRadius: s(2),
    backgroundColor: Colors.grayMedium, alignSelf: 'center', marginBottom: s(20),
  },
  modalTitle: { fontSize: s(18), fontFamily: Fonts.bold, color: Colors.textPrimary, marginBottom: s(16) },
  fieldLabel: { fontSize: s(13), fontFamily: Fonts.medium, color: Colors.textSecondary, marginBottom: s(8) },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: s(6),
    paddingHorizontal: s(12), paddingVertical: s(8), borderRadius: s(20),
    backgroundColor: Colors.grayLight, borderWidth: 1.5, borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.textSecondary },
  catChipTextActive: { color: Colors.white },
  modalInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: s(12),
    paddingHorizontal: s(16), paddingVertical: s(12),
    fontSize: s(14), fontFamily: Fonts.regular, color: Colors.textPrimary, marginBottom: s(14),
  },
  notesInput: { minHeight: s(72), textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: s(14),
    paddingVertical: s(14), alignItems: 'center', marginTop: s(4),
  },
  saveBtnText: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.white },
  cardFooter: {
    marginTop: s(8),
    gap: s(6),
    paddingBottom: s(2),
  },
  cardActionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    gap: s(4), marginBottom: s(6),
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: s(8),
  },
  cardMetaLeft: { flex: 1, alignItems: 'flex-start' },
  notesRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: s(6),
  },
  notesRowText: { fontSize: s(12), fontFamily: Fonts.regular, color: Colors.textPrimary, lineHeight: s(17), flexShrink: 1 },
  notesRowPlaceholder: { color: Colors.grayMedium },
  locationLabel: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: s(4),
    paddingHorizontal: s(8), paddingVertical: s(3),
    borderRadius: s(20), borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.bgLight,
  },
  locationLabelFilled: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  locationLabelText: { fontSize: s(10), fontFamily: Fonts.medium, color: Colors.grayMedium },
  locationLabelTextFilled: { color: Colors.primary, fontFamily: Fonts.bold },
  editChip: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: s(4),
    paddingHorizontal: s(8), paddingVertical: s(3),
    borderRadius: s(20), borderWidth: 1, borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  editChipText: { fontSize: s(10), fontFamily: Fonts.bold, color: Colors.primary },
  deleteChip: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: s(4),
    paddingHorizontal: s(8), paddingVertical: s(3),
    borderRadius: s(20), borderWidth: 1, borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  deleteChipText: { fontSize: s(10), fontFamily: Fonts.bold, color: '#b91c1c' },
  notesOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', paddingHorizontal: s(24),
  },
  notesModal: {
    backgroundColor: Colors.white, borderRadius: s(18),
    padding: s(20),
    shadowColor: '#000', shadowOffset: { width: 0, height: s(8) },
    shadowOpacity: 0.15, shadowRadius: s(20), elevation: 12,
  },
  notesModalTitle: { fontSize: s(16), fontFamily: Fonts.bold, color: Colors.textPrimary, marginBottom: s(12) },
  notesModalInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: s(12),
    paddingHorizontal: s(14), paddingVertical: s(12),
    fontSize: s(14), fontFamily: Fonts.regular, color: Colors.textPrimary,
    minHeight: s(100), textAlignVertical: 'top', marginBottom: s(16),
  },
  notesModalActions: { flexDirection: 'row', gap: s(10) },
  notesCancelBtn: {
    flex: 1, paddingVertical: s(12), borderRadius: s(12),
    borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  notesCancelText: { fontSize: s(14), fontFamily: Fonts.bold, color: Colors.textSecondary },
  notesSaveBtn: {
    flex: 1, paddingVertical: s(12), borderRadius: s(12),
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  notesSaveText: { fontSize: s(14), fontFamily: Fonts.bold, color: Colors.white },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', gap: s(8), marginBottom: s(14),
  },
  timeInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: s(12),
    paddingHorizontal: s(14), paddingVertical: s(12),
    fontSize: s(18), fontFamily: Fonts.bold, color: Colors.textPrimary,
    textAlign: 'center', width: s(64),
  },
  timeColon: {
    fontSize: s(20), fontFamily: Fonts.bold, color: Colors.textPrimary,
  },
  periodToggle: {
    flexDirection: 'row', borderRadius: s(12), overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.border, marginLeft: s(4),
  },
  periodBtn: {
    paddingHorizontal: s(14), paddingVertical: s(12),
    backgroundColor: Colors.white,
  },
  periodBtnActive: { backgroundColor: Colors.primary },
  periodText: { fontSize: s(14), fontFamily: Fonts.bold, color: Colors.textSecondary },
  periodTextActive: { color: Colors.white },
});

const mem = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: s(16),
    paddingTop: s(12),
    paddingBottom: s(40),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: s(12),
    gap: s(12),
  },
  eyebrow: {
    fontSize: s(11),
    fontFamily: Fonts.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: s(3),
  },
  empty: {
    alignItems: 'center', justifyContent: 'center',
    paddingTop: s(80), gap: s(10),
  },
  emptyTitle: { fontSize: s(16), fontFamily: Fonts.bold, color: Colors.textPrimary },
  emptyText: {
    fontSize: s(13), fontFamily: Fonts.regular, color: Colors.textSecondary,
    textAlign: 'center', maxWidth: s(240),
  },
  count: { fontSize: s(12), fontFamily: Fonts.medium, color: Colors.textSecondary },
  emptyHint: {
    flexDirection: 'row', alignItems: 'center', gap: s(6),
    marginTop: s(16), backgroundColor: Colors.primaryBg,
    borderRadius: s(12), paddingHorizontal: s(14), paddingVertical: s(10),
  },
  emptyHintText: { fontSize: s(13), fontFamily: Fonts.medium, color: Colors.primary },
  autoPlayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    paddingHorizontal: s(10),
    paddingVertical: s(6),
    borderRadius: s(999),
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: 'rgba(15,118,110,0.16)',
  },
  autoPlayChipPaused: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
  },
  autoPlayChipText: {
    fontSize: s(11),
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  autoPlayChipTextPaused: {
    color: Colors.grayMedium,
  },
  heroCard: {
    height: Math.floor(width * 0.86),
    borderRadius: s(20),
    overflow: 'hidden',
    backgroundColor: '#111',
    marginBottom: s(14),
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  heroContent: {
    position: 'absolute',
    left: s(16),
    right: s(16),
    bottom: s(16),
  },
  heroLabel: {
    fontSize: s(11),
    fontFamily: Fonts.bold,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: s(6),
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: s(22),
    lineHeight: s(28),
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  heroMeta: {
    fontSize: s(12),
    fontFamily: Fonts.medium,
    color: 'rgba(255,255,255,0.88)',
    marginTop: s(6),
  },
  heroDots: {
    position: 'absolute',
    bottom: s(14),
    alignSelf: 'center',
    flexDirection: 'row',
    gap: s(5),
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: s(999),
    paddingHorizontal: s(8),
    paddingVertical: s(6),
  },
  heroDot: {
    width: s(7),
    height: s(7),
    borderRadius: s(4),
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  heroDotActive: {
    width: s(20),
    backgroundColor: Colors.white,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: s(10),
    gap: s(12),
  },
  gridTitle: {
    fontSize: s(15),
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  gridHint: {
    flex: 1,
    textAlign: 'right',
    fontSize: s(11),
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: s(6),
  },
  thumbCard: {
    width: '31.8%',
    aspectRatio: 0.84,
    borderRadius: s(10),
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  thumbActiveRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: s(10),
  },
  thumbDay: {
    position: 'absolute',
    left: s(8),
    bottom: s(8),
    fontSize: s(10),
    fontFamily: Fonts.bold,
    color: Colors.white,
  },

  // Full-screen viewer
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerTopBar: {
    position: 'absolute', top: s(52), left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: s(16),
  },
  viewerIconBtn: {
    width: s(38), height: s(38), borderRadius: s(19),
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  viewerCounter: { fontSize: s(13), fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.8)' },
  viewerImg: { width, height: width * 1.35 },
  viewerCaption: { position: 'absolute', bottom: s(110), left: s(20), right: s(20) },
  viewerTitle: { fontSize: s(16), fontFamily: Fonts.bold, color: '#fff', marginBottom: s(2) },
  viewerDay: { fontSize: s(12), fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.65)' },
  viewerControls: {
    position: 'absolute', bottom: s(52), left: 0, right: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  viewerPlayBtn: {
    width: s(52), height: s(52), borderRadius: s(26),
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  dots: {
    position: 'absolute', bottom: s(28),
    flexDirection: 'row', gap: s(5), alignSelf: 'center',
  },
  dot: {
    width: s(5), height: s(5), borderRadius: s(3),
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: { backgroundColor: '#fff', width: s(16) },
});
