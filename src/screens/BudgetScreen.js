import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Image, StatusBar, Modal, TextInput,
  Keyboard, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  initDB, getBudgetSummary, getExpenses,
  addExpense, deleteExpense, getExpenseMonths,
  getSetting, setSetting,
  CATEGORIES, CATEGORY_META,
} from '../database/db';
import { getLakbayTip } from '../utils/budgetTips';

const { width } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);

const TABS = ['Overview', 'Expenses', 'Categories'];

const MASCOT_H       = s(300);
const MASCOT_W       = Math.round(MASCOT_H * 0.85);
const MASCOT_OFFSET  = Math.round(MASCOT_H * 0.45);
const MASCOT_VISIBLE = MASCOT_H - MASCOT_OFFSET;

// ── Donut ring ───────────────────────────────────────────────────────────────
function DonutRing({ pct }) {
  const SIZE = s(100), THICK = s(10), INNER = SIZE - THICK * 2;
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        borderWidth: THICK, borderColor: 'rgba(255,255,255,0.25)',
      }} />
      <View style={{
        position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        borderWidth: THICK, borderColor: 'transparent',
        borderRightColor: pct > 0 ? Colors.accent : 'transparent',
        borderTopColor: pct > 25 ? Colors.accent : 'transparent',
        transform: [{ rotate: '-45deg' }],
      }} />
      <View style={{
        width: INNER, height: INNER, borderRadius: INNER / 2,
        backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontFamily: Fonts.black, fontSize: s(20), color: Colors.white }}>{pct}%</Text>
      </View>
    </View>
  );
}

// ── Category breakdown row ───────────────────────────────────────────────────
function CategoryBar({ item }) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META['Others'];
  return (
    <View style={styles.catRow}>
      <View style={[styles.catIcon, { backgroundColor: meta.color + '22' }]}>
        <Ionicons name={meta.icon + '-outline'} size={s(18)} color={meta.color} />
      </View>
      <View style={styles.catInfo}>
        <View style={styles.catTop}>
          <Text style={styles.catName}>{item.category}</Text>
          <Text style={styles.catAmount}>₱{item.amount.toLocaleString()}</Text>
        </View>
        <View style={styles.catBarBg}>
          <View style={styles.catBarRow}>
            <View style={[styles.catBarFill, { flex: item.percentage / 100, backgroundColor: meta.color }]} />
            <View style={{ flex: Math.max(0, 1 - item.percentage / 100) }} />
          </View>
        </View>
        <Text style={styles.catPct}>{item.percentage}%</Text>
      </View>
    </View>
  );
}

// ── Single expense row ───────────────────────────────────────────────────────
function ExpenseItem({ item, onDelete }) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META['Others'];
  return (
    <View style={styles.catRow}>
      <View style={[styles.catIcon, { backgroundColor: meta.color + '22' }]}>
        <Ionicons name={meta.icon + '-outline'} size={s(18)} color={meta.color} />
      </View>
      <View style={styles.catInfo}>
        <Text style={styles.catName}>{item.note || item.category}</Text>
        <Text style={styles.catPct}>{item.category} · {item.date}</Text>
      </View>
      <Text style={[styles.catAmount, { color: Colors.primary }]}>
        -₱{Number(item.amount).toLocaleString()}
      </Text>
      <TouchableOpacity onPress={() => onDelete(item.id)} style={{ padding: s(4) }}>
        <Ionicons name="trash-outline" size={s(16)} color={Colors.grayMedium} />
      </TouchableOpacity>
    </View>
  );
}

// ── Add Expense bottom sheet modal ───────────────────────────────────────────
function AddExpenseModal({ visible, onClose, onSaved }) {
  const insets = useSafeAreaInsets();
  const [amount, setAmount]     = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [note, setNote]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const reset = () => { setAmount(''); setCategory(CATEGORIES[0]); setNote(''); };

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    setSaving(true);
    await addExpense({ amount: num, category, note, date: today });
    setSaving(false);
    reset();
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />

        <View style={[styles.modalSheet, {
          paddingBottom: kbHeight > 0 ? s(32) : insets.bottom + s(16),
          marginBottom: kbHeight > 0 ? kbHeight + s(12) : 0,
        }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Expense</Text>

          {/* Amount */}
          <Text style={styles.fieldLabel}>Amount (₱)</Text>
          <View style={styles.amountInputRow}>
            <Text style={styles.pesoSign}>₱</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={Colors.grayMedium}
              autoFocus
            />
          </View>

          {/* Category chips */}
          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: s(16) }}
          >
            {CATEGORIES.map(cat => {
              const meta   = CATEGORY_META[cat];
              const active = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, active && { backgroundColor: meta.color }]}
                  onPress={() => setCategory(cat)}
                >
                  <Ionicons
                    name={meta.icon + '-outline'}
                    size={s(14)}
                    color={active ? Colors.white : Colors.textSecondary}
                  />
                  <Text style={[styles.catChipText, active && { color: Colors.white }]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Note */}
          <Text style={styles.fieldLabel}>Note (optional)</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Lunch at Jollibee"
            placeholderTextColor={Colors.grayMedium}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.saveBtnText}>Save Expense</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Edit Budget Modal ────────────────────────────────────────────────────────
function EditBudgetModal({ visible, current, onClose, onSaved }) {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState(String(current));
  const [saving, setSaving] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => { setAmount(String(current)); }, [current]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid budget amount.');
      return;
    }
    setSaving(true);
    await updateBudgetTotal(num);
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalSheet, {
          paddingBottom: kbHeight > 0 ? s(32) : insets.bottom + s(16),
          marginBottom: kbHeight > 0 ? kbHeight + s(12) : 0,
        }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Edit Total Budget</Text>

          <Text style={styles.fieldLabel}>Budget Amount (₱)</Text>
          <View style={styles.amountInputRow}>
            <Text style={styles.pesoSign}>₱</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={Colors.grayMedium}
              autoFocus
              selectTextOnFocus
            />
          </View>

          {/* Quick preset amounts */}
          <Text style={styles.fieldLabel}>Quick Select</Text>
          <View style={styles.presetRow}>
            {[5000, 10000, 20000, 50000].map(preset => (
              <TouchableOpacity
                key={preset}
                style={[styles.presetChip, amount === String(preset) && styles.presetChipActive]}
                onPress={() => setAmount(String(preset))}
              >
                <Text style={[styles.presetText, amount === String(preset) && styles.presetTextActive]}>
                  ₱{preset.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.saveBtnText}>Update Budget</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Month Filter Modal ───────────────────────────────────────────────────────
function FilterModal({ visible, months, selected, onSelect, onClose }) {
  const insets = useSafeAreaInsets();

  const formatMonth = (m) => {
    const [year, month] = m.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + s(16) }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Filter by Month</Text>

          {/* All time option */}
          <TouchableOpacity
            style={[styles.monthItem, !selected && styles.monthItemActive]}
            onPress={() => { onSelect(null); onClose(); }}
          >
            <Ionicons
              name="calendar"
              size={s(18)}
              color={!selected ? Colors.white : Colors.textSecondary}
            />
            <Text style={[styles.monthItemText, !selected && styles.monthItemTextActive]}>
              All Time
            </Text>
            {!selected && <Ionicons name="checkmark" size={s(18)} color={Colors.white} />}
          </TouchableOpacity>

          {months.length === 0 && (
            <Text style={[styles.fieldLabel, { textAlign: 'center', marginTop: s(12) }]}>
              No expenses recorded yet.
            </Text>
          )}

          {months.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.monthItem, selected === m && styles.monthItemActive]}
              onPress={() => { onSelect(m); onClose(); }}
            >
              <Ionicons
                name="calendar-outline"
                size={s(18)}
                color={selected === m ? Colors.white : Colors.textSecondary}
              />
              <Text style={[styles.monthItemText, selected === m && styles.monthItemTextActive]}>
                {formatMonth(m)}
              </Text>
              {selected === m && <Ionicons name="checkmark" size={s(18)} color={Colors.white} />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [summary, setSummary]     = useState(null);
  const [expenses, setExpenses]   = useState([]);
  const [showModal, setShowModal]             = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedMonth, setSelectedMonth]     = useState(null); // null = all time
  const [availableMonths, setAvailableMonths] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [people, setPeople]                   = useState(1);

  const loadData = useCallback(async () => {
    await initDB();
    const [sum, exp, months, savedPeople] = await Promise.all([
      getBudgetSummary('1', selectedMonth),
      getExpenses('1', selectedMonth),
      getExpenseMonths(),
      getSetting('budget_people', '1'),
    ]);
    setSummary(sum);
    setExpenses(exp);
    setAvailableMonths(months.map(m => m.month));
    setPeople(Math.max(1, parseInt(savedPeople) || 1));
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePeopleChange = async (n) => {
    const val = Math.max(1, Math.min(20, n));
    setPeople(val);
    await setSetting('budget_people', String(val));
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Expense', 'Remove this expense?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteExpense(id); loadData(); } },
    ]);
  };

  const pct = summary && summary.total > 0 ? Math.min(Math.round((summary.spent / summary.total) * 100), 100) : 0;

  const tipText = getLakbayTip(summary);

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + s(10) }]}>
        <Text style={styles.headerTitle}>Budget Tracker</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.calBtn, selectedMonth && { backgroundColor: 'rgba(255,255,255,0.4)' }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="calendar-outline" size={s(20)} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addExpenseBtn}
            activeOpacity={0.85}
            onPress={() => setShowModal(true)}
          >
            <Ionicons name="add" size={s(16)} color={Colors.white} />
            <Text style={styles.addExpenseBtnText}>Add Expense</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SUMMARY CARD ── */}
      <LinearGradient
        colors={['#E8334A', '#D62828', '#B01C1C']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <View style={styles.summaryLeft}>
          <Text style={styles.totalLabel}>
            {selectedMonth
              ? new Date(selectedMonth + '-01').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
              : 'Total Budget'}
          </Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalValue}>₱{(summary?.total ?? 0).toLocaleString()}.00</Text>
            <TouchableOpacity
              style={styles.editBudgetBtn}
              onPress={() => setShowBudgetModal(true)}
            >
              <Ionicons name="pencil" size={s(13)} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: s(12) }}>
            <Text style={styles.remainingLabel}>Remaining</Text>
            <Text style={styles.remainingValue}>₱{(summary?.remaining ?? 0).toLocaleString()}.00</Text>
          </View>

          {/* Per-person split */}
          <View style={styles.splitRow}>
            <TouchableOpacity
              style={styles.splitBtn}
              onPress={() => handlePeopleChange(people - 1)}
            >
              <Ionicons name="remove" size={s(14)} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.splitCenter}>
              <Ionicons name="people-outline" size={s(13)} color="rgba(255,255,255,0.8)" />
              <Text style={styles.splitText}>
                {people === 1 ? 'Solo' : `${people} people · ₱${Math.ceil((summary?.spent ?? 0) / people).toLocaleString()} each`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.splitBtn}
              onPress={() => handlePeopleChange(people + 1)}
            >
              <Ionicons name="add" size={s(14)} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
        <DonutRing pct={pct} />
      </LinearGradient>

      {/* ── TABS ── */}
      <View style={styles.tabRow}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === i && styles.tabActive]}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── FIXED CARD — title fixed, list inside scrolls ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {activeTab === 0 ? 'Expenses Breakdown' : activeTab === 1 ? 'All Expenses' : 'By Category'}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: s(14), paddingBottom: s(16) }}>
          {/* Overview */}
          {activeTab === 0 && (
            summary?.breakdown?.length > 0
              ? summary.breakdown.map((item, i) => <CategoryBar key={i} item={item} />)
              : <EmptyState text={`No expenses yet.\nTap "+ Add Expense" to start tracking.`} />
          )}

          {/* Expenses */}
          {activeTab === 1 && (
            expenses.length > 0
              ? expenses.map(item => <ExpenseItem key={item.id} item={item} onDelete={handleDelete} />)
              : <EmptyState text="No expenses recorded yet." />
          )}

          {/* Categories */}
          {activeTab === 2 && CATEGORIES.map(cat => {
            const meta  = CATEGORY_META[cat];
            const found = summary?.breakdown?.find(b => b.category === cat);
            return (
              <View key={cat} style={styles.catRow}>
                <View style={[styles.catIcon, { backgroundColor: meta.color + '22' }]}>
                  <Ionicons name={meta.icon + '-outline'} size={s(18)} color={meta.color} />
                </View>
                <View style={styles.catInfo}>
                  <Text style={styles.catName}>{cat}</Text>
                  <Text style={styles.catPct}>{found ? `${found.percentage}% of total` : 'No expenses'}</Text>
                </View>
                <Text style={styles.catAmount}>₱{(found?.amount ?? 0).toLocaleString()}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* ── SPEECH BUBBLE ── */}
      <View style={styles.speechBubble} pointerEvents="none">
        <View style={styles.tipTitleRow}>
          <View style={styles.tipIconBg}>
            <Ionicons name="sparkles" size={s(13)} color={Colors.primary} />
          </View>
          <Text style={styles.tipTitle}>Lakbay Tip</Text>
        </View>
        <Text style={styles.tipText} numberOfLines={2} ellipsizeMode="tail">{tipText}</Text>
        <View style={styles.bubbleTail} />
      </View>

      {/* ── MASCOT ── */}
      <Image
        source={require('../../assets/images/budget/mascot.png')}
        style={styles.mascot}
        resizeMode="contain"
        pointerEvents="none"
      />

      {/* ── ADD EXPENSE MODAL ── */}
      <AddExpenseModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSaved={loadData}
      />

      {/* ── MONTH FILTER MODAL ── */}
      <FilterModal
        visible={showFilterModal}
        months={availableMonths}
        selected={selectedMonth}
        onSelect={setSelectedMonth}
        onClose={() => setShowFilterModal(false)}
      />

      {/* ── EDIT BUDGET MODAL ── */}
      <EditBudgetModal
        visible={showBudgetModal}
        current={summary?.total ?? 0}
        onClose={() => setShowBudgetModal(false)}
        onSaved={loadData}
      />
    </View>
  );
}

function EmptyState({ text }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={s(40)} color={Colors.grayMedium} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F5' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, paddingHorizontal: s(16), paddingBottom: s(14),
  },
  headerTitle: { fontFamily: Fonts.bold, fontSize: s(18), color: Colors.white, flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  calBtn: {
    width: s(36), height: s(36), borderRadius: s(18),
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  addExpenseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: s(4),
    borderWidth: 1.5, borderColor: Colors.white,
    borderRadius: s(20), paddingHorizontal: s(10), paddingVertical: s(6),
  },
  addExpenseBtnText: { fontFamily: Fonts.bold, fontSize: s(12), color: Colors.white },

  // Summary card
  summaryCard: {
    marginHorizontal: s(16), marginTop: s(16), borderRadius: s(20), padding: s(20),
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: s(8) },
    shadowOpacity: 0.35, shadowRadius: s(16), elevation: 10,
  },
  summaryLeft: { flex: 1 },
  totalLabel: { fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.75)', fontSize: s(13) },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: s(8), marginTop: s(2) },
  totalValue: { fontFamily: Fonts.black, color: Colors.white, fontSize: s(26) },
  editBudgetBtn: {
    width: s(26), height: s(26), borderRadius: s(13),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  remainingLabel: { fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.75)', fontSize: s(12) },
  remainingValue: { fontFamily: Fonts.bold, color: Colors.white, fontSize: s(18), marginTop: s(2) },
  splitRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: s(14), gap: s(8),
  },
  splitBtn: {
    width: s(26), height: s(26), borderRadius: s(13),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  splitCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: s(5),
  },
  splitText: { fontSize: s(12), fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.9)', flex: 1 },

  // Tabs
  tabRow: {
    flexDirection: 'row', marginHorizontal: s(16), marginTop: s(16),
    backgroundColor: Colors.white, borderRadius: s(20), padding: s(4),
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  tab: { flex: 1, paddingVertical: s(9), borderRadius: s(16), alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontFamily: Fonts.medium, fontSize: s(13), color: Colors.textSecondary },
  tabTextActive: { fontFamily: Fonts.bold, color: Colors.white },

  // Content card — fixed, stops above bubble+mascot with breathing room
  // Bubble top ≈ MASCOT_VISIBLE*0.28 + ~s(95) bubble height
  // Mascot top = MASCOT_VISIBLE
  // Use MASCOT_VISIBLE + s(20) so card always clears both with a visible gap
  card: {
    flex: 1,
    backgroundColor: Colors.white, marginHorizontal: s(16), marginTop: s(12),
    marginBottom: Math.round(MASCOT_VISIBLE * 0.95),
    borderRadius: s(16), padding: s(16),
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontFamily: Fonts.bold, fontSize: s(15), color: Colors.textPrimary, marginBottom: s(12) },

  // Shared row styles
  catRow: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  catIcon: { width: s(40), height: s(40), borderRadius: s(10), alignItems: 'center', justifyContent: 'center' },
  catInfo: { flex: 1 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { fontFamily: Fonts.bold, fontSize: s(13), color: Colors.textPrimary },
  catAmount: { fontFamily: Fonts.bold, fontSize: s(13), color: Colors.textPrimary },
  catBarBg: { height: s(6), backgroundColor: Colors.grayLight, borderRadius: s(3), marginTop: s(5), overflow: 'hidden' },
  catBarRow: { flex: 1, flexDirection: 'row', height: s(6) },
  catBarFill: { borderRadius: s(3) },
  catPct: { fontFamily: Fonts.regular, fontSize: s(11), color: Colors.textSecondary, marginTop: s(2) },

  emptyState: { alignItems: 'center', paddingVertical: s(24), gap: s(8) },
  emptyText: { fontFamily: Fonts.regular, fontSize: s(13), color: Colors.textSecondary, textAlign: 'center', lineHeight: s(20) },

  // Mascot & bubble
  mascot: {
    position: 'absolute', right: s(-40), bottom: -MASCOT_OFFSET,
    width: MASCOT_W, height: MASCOT_H, zIndex: 10,
  },
  speechBubble: {
    position: 'absolute', left: s(16), right: s(158),
    bottom: Math.round(MASCOT_VISIBLE * 0.28), zIndex: 10,
    backgroundColor: Colors.white, borderRadius: s(16),
    borderWidth: 1, borderColor: '#FFD0D0', padding: s(14),
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  bubbleTail: {
    position: 'absolute', right: -s(10), bottom: s(20),
    width: 0, height: 0,
    borderTopWidth: s(8), borderBottomWidth: s(8), borderLeftWidth: s(10),
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: Colors.white,
  },
  tipTitleRow: { flexDirection: 'row', alignItems: 'center', gap: s(6), marginBottom: s(6) },
  tipIconBg: {
    width: s(24), height: s(24), borderRadius: s(8),
    backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  tipTitle: { fontFamily: Fonts.bold, fontSize: s(13), color: Colors.primary },
  tipText: { fontFamily: Fonts.regular, fontSize: s(12), color: Colors.textSecondary, lineHeight: s(18) },

  // Modal
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: s(24), borderTopRightRadius: s(24), padding: s(20),
  },
  modalHandle: {
    width: s(40), height: s(4), borderRadius: s(2),
    backgroundColor: Colors.grayMedium, alignSelf: 'center', marginBottom: s(16),
  },
  modalTitle: { fontFamily: Fonts.bold, fontSize: s(18), color: Colors.textPrimary, marginBottom: s(20) },
  fieldLabel: { fontFamily: Fonts.medium, fontSize: s(13), color: Colors.textSecondary, marginBottom: s(8) },
  amountInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgLight, borderRadius: s(12),
    paddingHorizontal: s(14), marginBottom: s(20),
    borderWidth: 1, borderColor: Colors.border,
  },
  pesoSign: { fontFamily: Fonts.bold, fontSize: s(20), color: Colors.primary, marginRight: s(4) },
  amountInput: {
    flex: 1, fontFamily: Fonts.bold, fontSize: s(24),
    color: Colors.textPrimary, paddingVertical: s(12),
  },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: s(6),
    backgroundColor: Colors.grayLight, borderRadius: s(20),
    paddingHorizontal: s(14), paddingVertical: s(8), marginRight: s(8),
  },
  catChipText: { fontFamily: Fonts.medium, fontSize: s(13), color: Colors.textSecondary },
  noteInput: {
    backgroundColor: Colors.bgLight, borderRadius: s(12),
    paddingHorizontal: s(14), paddingVertical: s(12),
    fontFamily: Fonts.regular, fontSize: s(14), color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border, marginBottom: s(24),
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: s(16), paddingVertical: s(16), alignItems: 'center',
  },
  saveBtnText: { fontFamily: Fonts.bold, fontSize: s(16), color: Colors.white },

  // Preset chips
  presetRow: { flexDirection: 'row', gap: s(8), marginBottom: s(24), flexWrap: 'wrap' },
  presetChip: {
    paddingHorizontal: s(14), paddingVertical: s(8),
    borderRadius: s(20), backgroundColor: Colors.grayLight,
    borderWidth: 1, borderColor: Colors.grayMedium,
  },
  presetChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  presetText: { fontFamily: Fonts.medium, fontSize: s(13), color: Colors.textSecondary },
  presetTextActive: { color: Colors.white },

  // Month filter
  monthItem: {
    flexDirection: 'row', alignItems: 'center', gap: s(12),
    padding: s(14), borderRadius: s(12), marginBottom: s(8),
    backgroundColor: Colors.grayLight,
  },
  monthItemActive: { backgroundColor: Colors.primary },
  monthItemText: { flex: 1, fontFamily: Fonts.medium, fontSize: s(14), color: Colors.textSecondary },
  monthItemTextActive: { color: Colors.white, fontFamily: Fonts.bold },
});
