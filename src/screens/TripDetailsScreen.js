import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Image, StatusBar, Modal, TextInput,
  Platform, Keyboard, Alert, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getTripActivities, getAllTripActivities, addTripActivity, deleteTripActivity, toggleActivityDone, updateActivityPhotos, updateActivityNotes, updateActivityLocation, getDayLabel, setDayLabel, getPackingItems, addPackingItem, togglePackingItem, deletePackingItem, reorderActivities } from '../database/db';

const { width } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);
// list pad s(16)*2 + timeCol s(52) + timelineCol s(20) + card marginLeft s(10) + card pad s(10)*2 + container pad s(10)*2 + 2 gaps s(6)*2
const PHOTO_SIZE = Math.floor((width - s(16)*2 - s(52) - s(20) - s(10) - s(10)*2 - s(10)*2 - s(6)*2) / 3);


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

function AddActivityModal({ visible, tripId, day, onClose, onSaved }) {
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

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

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
    await addTripActivity({
      tripId, day,
      time: buildTime(),
      title: title.trim(),
      subtitle: subtitle.trim(),
      notes: notes.trim(),
      category,
      cost: 0,
    });
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
          <Text style={styles.modalTitle}>Add Activity</Text>

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
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Add Activity'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const MAX_PHOTOS = 3;

function ActivityCard({ activity, isLast, isFirst, isLastCard, onDelete, onToggleDone, onPhotoUpdate, onNotesUpdate, onLocationUpdate, onMoveUp, onMoveDown }) {
  const done = !!activity.done;
  const photos = (() => {
    try { return JSON.parse(activity.photo_uri || '[]'); } catch { return []; }
  })();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(activity.notes || '');
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationText, setLocationText] = useState(activity.location || '');

  const handleAddPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to attach images to activities.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        onPhotoUpdate([...photos, result.assets[0].uri]);
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not open photo library.');
    }
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

  return (
    <View style={styles.activityRow}>
      <View style={styles.timeCol}>
        <Text style={[styles.timeText, done && styles.timeTextDone]}>{activity.time.replace(' ', '\n')}</Text>
      </View>
      <View style={styles.timelineCol}>
        <View style={[styles.dot, done && styles.dotDone]} />
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={[styles.card, done && styles.cardDone]}>
        {/* Top row: icon + title + done circle + drag handle */}
        <TouchableOpacity
          style={styles.cardTopRow}
          onLongPress={() => Alert.alert('Delete Activity', `Delete "${activity.title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ])}
          activeOpacity={0.85}
        >
          <ActivityIconView category={activity.category} />
          <View style={styles.cardBody}>
            <Text style={[styles.cardTitle, done && styles.cardTitleDone]}>{activity.title}</Text>
            {!!activity.subtitle && <Text style={[styles.cardSub, done && styles.cardSubDone]}>{activity.subtitle}</Text>}
          </View>
          <TouchableOpacity onPress={onToggleDone} style={[styles.doneBtn, done && styles.doneBtnActive]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {done ? (
              <View style={styles.doneCircleFilled}>
                <Ionicons name="checkmark" size={s(8)} color={Colors.white} />
              </View>
            ) : (
              <View style={styles.doneCircleEmpty} />
            )}
            <Text style={[styles.doneBtnLabel, done && styles.doneBtnLabelActive]}>
              {done ? 'Done' : 'Mark done'}
            </Text>
          </TouchableOpacity>
          <View style={styles.reorderBtns}>
            <TouchableOpacity onPress={onMoveUp} disabled={isFirst} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="chevron-up" size={s(16)} color={isFirst ? Colors.grayLight : Colors.grayMedium} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onMoveDown} disabled={isLastCard} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="chevron-down" size={s(16)} color={isLastCard ? Colors.grayLight : Colors.grayMedium} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

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
            {/* Notes row */}
            <TouchableOpacity
              onPress={() => { setNotesText(activity.notes || ''); setEditingNotes(true); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.notesRowText, !notesText && styles.notesRowPlaceholder]} numberOfLines={2}>
                {notesText || 'Add a note…'}
              </Text>
            </TouchableOpacity>

            {/* Location label */}
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
    </View>
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
  const [activeView, setActiveView] = useState('itinerary'); // 'itinerary' | 'packing'
  const [packingItems, setPackingItems] = useState([]);
  const [newPackingItem, setNewPackingItem] = useState('');
  const [addingPackingItem, setAddingPackingItem] = useState(false);

  const days = trip?.days || 1;
  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1);

  const totalActivities = allActivities.length;
  const doneActivities = allActivities.filter(a => a.done).length;
  const completionPct = totalActivities > 0 ? Math.round((doneActivities / totalActivities) * 100) : 0;

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

  const handleTogglePackingItem = async (item) => {
    await togglePackingItem(item.id, !item.checked);
    loadPackingItems();
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

  const handleMoveActivity = async (index, direction) => {
    const newActivities = [...activities];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newActivities.length) return;
    [newActivities[index], newActivities[swapIndex]] = [newActivities[swapIndex], newActivities[index]];
    setActivities(newActivities);
    await reorderActivities(newActivities.map(a => a.id));
  };


  const handleToggleDone = async (activity) => {
    await toggleActivityDone(activity.id, !activity.done);
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
          onPress={() => navigation.navigate('PlaceDiscovery', { trip })}>
          <Ionicons name="compass-outline" size={s(22)} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={s(24)} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Trip summary */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryStatsRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{days}</Text>
            <Text style={styles.summaryLabel}>Days</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalActivities}</Text>
            <Text style={styles.summaryLabel}>Activities</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{doneActivities}/{totalActivities}</Text>
            <Text style={styles.summaryLabel}>Done</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, completionPct === 100 && { color: Colors.primary }]}>{completionPct}%</Text>
            <Text style={styles.summaryLabel}>Complete</Text>
          </View>
        </View>
        {/* Progress bar */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${completionPct}%` }, completionPct === 100 && styles.progressBarComplete]} />
        </View>
      </View>

      {/* View switcher */}
      <View style={styles.viewSwitcher}>
        <TouchableOpacity
          style={[styles.viewSwitcherBtn, activeView === 'itinerary' && styles.viewSwitcherActive]}
          onPress={() => setActiveView('itinerary')}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={s(14)} color={activeView === 'itinerary' ? Colors.white : Colors.grayMedium} />
          <Text style={[styles.viewSwitcherLabel, activeView === 'itinerary' && styles.viewSwitcherLabelActive]}>Itinerary</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewSwitcherBtn, activeView === 'packing' && styles.viewSwitcherActive]}
          onPress={() => setActiveView('packing')}
          activeOpacity={0.8}
        >
          <Ionicons name="bag-outline" size={s(14)} color={activeView === 'packing' ? Colors.white : Colors.grayMedium} />
          <Text style={[styles.viewSwitcherLabel, activeView === 'packing' && styles.viewSwitcherLabelActive]}>Packing List</Text>
          {packingItems.length > 0 && (
            <View style={styles.packingBadge}>
              <Text style={styles.packingBadgeText}>{packingItems.filter(i => !i.checked).length}</Text>
            </View>
          )}
        </TouchableOpacity>
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
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.activitiesList, { paddingBottom: s(20) }]}>
              {activities.map((activity, i) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  isLast={i === activities.length - 1}
                  isFirst={i === 0}
                  isLastCard={i === activities.length - 1}
                  onDelete={() => handleDeleteActivity(activity.id)}
                  onToggleDone={() => handleToggleDone(activity)}
                  onPhotoUpdate={(uris) => handlePhotoUpdate(activity.id, uris)}
                  onNotesUpdate={(notes) => handleNotesUpdate(activity.id, notes)}
                  onLocationUpdate={(loc) => handleLocationUpdate(activity.id, loc)}
                  onMoveUp={() => handleMoveActivity(i, 'up')}
                  onMoveDown={() => handleMoveActivity(i, 'down')}
                />
              ))}
            </ScrollView>
          )}
        </>
      ) : (
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
                <TouchableOpacity
                  key={item.id}
                  style={styles.packingItem}
                  onPress={() => handleTogglePackingItem(item)}
                  onLongPress={() => handleDeletePackingItem(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.packingCheck, item.checked && styles.packingCheckDone]}>
                    {!!item.checked && <Ionicons name="checkmark" size={s(12)} color={Colors.white} />}
                  </View>
                  <Text style={[styles.packingItemText, item.checked && styles.packingItemTextDone]}>
                    {item.item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <AddActivityModal
        visible={showAddModal}
        tripId={trip?.id}
        day={selectedDay + 1}
        onClose={() => setShowAddModal(false)}
        onSaved={() => { loadActivities(); loadAllActivities(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgLight },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: s(16), paddingBottom: s(14),
  },
  headerBtn: { width: s(36), height: s(36), alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: s(17), fontFamily: Fonts.bold, color: Colors.white },
  headerSub: { fontSize: s(11), fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.75)', marginTop: s(2) },
  summaryBar: {
    flexDirection: 'column',
    backgroundColor: Colors.white,
    paddingTop: s(10), paddingBottom: s(12),
    paddingHorizontal: s(16),
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
    gap: s(10),
  },
  summaryStatsRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.textPrimary },
  summaryLabel: { fontSize: s(10), fontFamily: Fonts.regular, color: Colors.grayMedium, marginTop: s(1) },
  summaryDivider: { width: 1, height: s(28), backgroundColor: Colors.border },
  progressBarTrack: {
    width: '100%', height: s(6), borderRadius: s(3),
    backgroundColor: Colors.grayLight, overflow: 'hidden',
  },
  progressBarFill: {
    height: s(6), borderRadius: s(3), backgroundColor: Colors.primary,
  },
  progressBarComplete: { backgroundColor: '#22c55e' },
  tabBar: { backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
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
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  dayLabelText: { fontSize: s(12), fontFamily: Fonts.medium, color: Colors.primary, flex: 1 },
  dayLabelPlaceholder: { color: Colors.grayMedium, fontFamily: Fonts.regular },
  scrollContent: {},
  activitiesList: { paddingHorizontal: s(16), paddingTop: s(16) },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: s(10) },
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
  cardTitle: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.textPrimary },
  cardTitleDone: { color: Colors.textTertiary, textDecorationLine: 'line-through' },
  cardSub: { fontSize: s(11), fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: s(2) },
  cardSubDone: { color: Colors.textTertiary },
  cardDone: { opacity: 0.7 },
  reorderBtns: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: s(2), paddingLeft: s(4) },
  timeTextDone: { color: Colors.textTertiary },
  dotDone: { backgroundColor: Colors.textTertiary },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: s(4),
    paddingHorizontal: s(8), paddingVertical: s(3),
    borderRadius: s(20),
    backgroundColor: Colors.bgLight,
    borderWidth: 1.5, borderColor: Colors.border,
    transform: [{ skewX: '-8deg' }],
  },
  doneBtnActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primary,
  },
  doneBtnLabel: { fontSize: s(10), fontFamily: Fonts.bold, color: Colors.grayMedium, transform: [{ skewX: '8deg' }] },
  doneBtnLabelActive: { color: Colors.primary },
  doneCircleEmpty: {
    width: s(13), height: s(13), borderRadius: s(7),
    borderWidth: 1.5, borderColor: '#C7C7CC',
    transform: [{ skewX: '8deg' }],
  },
  doneCircleFilled: {
    width: s(13), height: s(13), borderRadius: s(7),
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
    flexDirection: 'row', backgroundColor: Colors.white,
    paddingHorizontal: s(16), paddingVertical: s(10), gap: s(8),
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  viewSwitcherBtn: {
    flexDirection: 'row', alignItems: 'center', gap: s(6),
    paddingHorizontal: s(14), paddingVertical: s(7),
    borderRadius: s(20), backgroundColor: Colors.grayLight,
  },
  viewSwitcherActive: { backgroundColor: Colors.primary },
  viewSwitcherLabel: { fontSize: s(12), fontFamily: Fonts.bold, color: Colors.grayMedium },
  viewSwitcherLabelActive: { color: Colors.white },
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
