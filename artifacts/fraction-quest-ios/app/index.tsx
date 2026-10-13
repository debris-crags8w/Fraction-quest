import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  EMPTY_SAVED_PROGRESS,
  MISSIONS,
  UNIT_INFO,
  answerMatches,
  checkWorksheet,
  cleanSavedProgress,
  findFirstUnfinishedPractice,
  getBuildChecks,
  getLessonRecord,
  getWorksheet,
  hasLearningGate,
  isLessonComplete,
  isLessonOpen,
  targetedPracticeCount,
  targetedPracticePlans,
  type LearningModel,
  type LearningRecord,
  type SavedProgress,
  type WorksheetProblem,
  toWebProgress,
} from '../lib/curriculum';
import {
  AnswerTileBuilder,
} from '../components/AnswerTileBuilder';
import {
  ModelBuilder,
  ModelPreview,
  WorksheetModelInput,
  blankBuildState,
  type BuildState,
} from '../components/LearningActivity';

const STORAGE_KEY = 'fraction-quest-ios-progress-v2';
const LEGACY_STORAGE_KEY = 'fraction-quest-ios-progress-v1';
type Screen = 'home' | 'practice' | 'build' | 'worksheet' | 'targeted' | 'complete';
type AnswerResult = 'idle' | 'correct' | 'incorrect' | 'save-error';

function useStyles() {
  const colors = useColors();
  return useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20, paddingBottom: 36, gap: 20 },
    brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    brandIcon: { width: 38, height: 38, borderRadius: 12 },
    brandName: { color: colors.foreground, fontSize: 18, fontFamily: 'BricolageGrotesque_700Bold' },
    profileBadge: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    eyebrow: { color: colors.secondary, fontSize: 12, fontFamily: 'BricolageGrotesque_700Bold', textTransform: 'uppercase', letterSpacing: 1.1 },
    title: { color: colors.foreground, fontSize: 30, lineHeight: 37, fontFamily: 'BricolageGrotesque_700Bold', letterSpacing: -0.6, marginTop: 7 },
    body: { color: colors.mutedForeground, fontSize: 14, lineHeight: 21, fontFamily: 'BricolageGrotesque_400Regular' },
    card: { padding: 17, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, gap: 12 },
    progressCard: { padding: 19, borderRadius: colors.radius, backgroundColor: colors.secondary, gap: 12 },
    progressTitle: { color: colors.secondaryForeground, fontSize: 16, fontFamily: 'BricolageGrotesque_700Bold' },
    progressCopy: { color: colors.secondaryForeground, opacity: 0.84, fontSize: 13, marginTop: 4 },
    progressCount: { color: colors.secondaryForeground, fontSize: 28, fontFamily: 'BricolageGrotesque_700Bold' },
    progressTrack: { height: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.24)', overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 8, backgroundColor: colors.accent },
    sectionHeading: { color: colors.foreground, fontSize: 21, fontFamily: 'BricolageGrotesque_700Bold' },
    sectionSubheading: { color: colors.mutedForeground, fontSize: 13, lineHeight: 18, marginTop: 4 },
    unitCard: { borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, overflow: 'hidden' },
    unitHeading: { padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: colors.muted },
    unitKicker: { color: colors.secondary, fontSize: 11, fontFamily: 'BricolageGrotesque_700Bold', textTransform: 'uppercase', letterSpacing: 0.7 },
    unitTitle: { color: colors.foreground, fontSize: 17, fontFamily: 'BricolageGrotesque_700Bold', marginTop: 3 },
    unitSubtitle: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17, marginTop: 3 },
    unitCount: { minWidth: 42, textAlign: 'center', color: colors.secondary, fontSize: 14, fontWeight: '700' },
    lessonItem: { padding: 14, borderTopWidth: 1, borderColor: colors.border, gap: 8 },
    lessonLocked: { opacity: 0.57 },
    lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    lessonNumber: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.coralSoft },
    lessonText: { flex: 1, gap: 2 },
    lessonName: { color: colors.foreground, fontSize: 15, fontFamily: 'BricolageGrotesque_700Bold' },
    lessonDescription: { color: colors.mutedForeground, fontSize: 12, lineHeight: 17 },
    lessonProgress: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600' },
    lessonAction: { minHeight: 40, paddingHorizontal: 13, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary },
    lessonActionTeal: { backgroundColor: colors.secondary },
    lessonActionLocked: { backgroundColor: colors.muted },
    lessonActionText: { color: colors.primaryForeground, fontSize: 12, fontWeight: '700' },
    lessonActionLockedText: { color: colors.mutedForeground },
    note: { padding: 15, borderRadius: 17, backgroundColor: colors.goldSoft, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    headerMain: { flex: 1 },
    stepLabel: { color: colors.secondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
    headerTitle: { color: colors.foreground, fontSize: 20, lineHeight: 25, fontFamily: 'BricolageGrotesque_700Bold' },
    stat: { color: colors.secondary, fontWeight: '700', fontSize: 12 },
    question: { color: colors.foreground, fontSize: 21, lineHeight: 28, fontFamily: 'BricolageGrotesque_700Bold' },
    option: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: colors.border, padding: 14, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 10 },
    optionSelected: { borderColor: colors.primary, backgroundColor: colors.coralSoft },
    optionText: { color: colors.foreground, flex: 1, fontSize: 15, lineHeight: 21 },
    button: { minHeight: 54, borderRadius: 16, backgroundColor: colors.primary, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
    buttonDisabled: { opacity: 0.45 },
    buttonText: { color: colors.primaryForeground, fontSize: 15, fontFamily: 'BricolageGrotesque_700Bold' },
    secondaryButton: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    secondaryButtonText: { color: colors.secondary, fontWeight: '700', fontSize: 14 },
    feedback: { borderRadius: 14, padding: 13, backgroundColor: colors.coralSoft, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
    feedbackGood: { backgroundColor: colors.tealSoft },
    feedbackText: { color: colors.foreground, flex: 1, fontSize: 13, lineHeight: 19 },
    meter: { height: 7, borderRadius: 7, backgroundColor: colors.muted, overflow: 'hidden' },
    meterFill: { height: '100%', backgroundColor: colors.primary },
    errorScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 26, gap: 14 },
    errorTitle: { color: colors.foreground, textAlign: 'center', fontSize: 23, fontFamily: 'BricolageGrotesque_700Bold' },
    errorCopy: { color: colors.mutedForeground, textAlign: 'center', fontSize: 15, lineHeight: 22 },
  }), [colors.accent, colors.background, colors.border, colors.card, colors.coralSoft, colors.foreground,
    colors.goldSoft, colors.muted, colors.mutedForeground, colors.primary, colors.primaryForeground,
    colors.radius, colors.secondary, colors.secondaryForeground, colors.success, colors.tealSoft]);
}

function isCheckCorrect(target: LearningModel, kind: LearningModel['kind'], state: BuildState): boolean {
  if (state.d !== target.d || state.count !== target.n) return false;
  if (kind === 'set' && target.total && target.total % state.d !== 0) return false;
  return kind !== 'bar' || state.wholes === target.wholes;
}

function gatedWorksheetModel(problem: WorksheetProblem): boolean {
  return (!!problem.modelRequired && problem.model?.kind === 'bar')
    || !!problem.rulerTask || !!problem.linePlotTask || !!problem.scaleTask || !!(problem.area && problem.areaTask);
}

function worksheetAnswerCount(record: LearningRecord, missionId: string): number {
  return Object.keys(record.worksheet).filter((id) => {
    const problem = getWorksheet(missionId).find((item) => item.id === id);
    const answer = record.worksheet[id];
    return problem && answer.checkedValue === answer.draft && answerMatches(problem, answer.draft);
  }).length;
}

export default function HomeScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const [progress, setProgress] = useState<SavedProgress>(EMPTY_SAVED_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [activeMissionId, setActiveMissionId] = useState(MISSIONS[0].id);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [buildIndex, setBuildIndex] = useState(0);
  const [primaryBuild, setPrimaryBuild] = useState<BuildState>(blankBuildState());
  const [secondaryBuild, setSecondaryBuild] = useState<BuildState>(blankBuildState());
  const [selectedReason, setSelectedReason] = useState<number | null>(null);
  const [buildSupported, setBuildSupported] = useState(false);
  const [worksheetIndex, setWorksheetIndex] = useState(0);
  const [targetedIndex, setTargetedIndex] = useState(0);
  const [answerDraft, setAnswerDraft] = useState('');
  const [worksheetModelReady, setWorksheetModelReady] = useState(false);
  const [result, setResult] = useState<AnswerResult>('idle');
  const [hintVisible, setHintVisible] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 14);

  const persist = useCallback(async (next: SavedProgress): Promise<boolean> => {
    setStorageError(null);
    setProgress(next);
    saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    });
    try {
      await saveQueue.current;
      return true;
    } catch {
      setStorageError('Your latest answer could not be saved on this device.');
      setResult('save-error');
      return false;
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setStorageError(null);
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setProgress(cleanSavedProgress(JSON.parse(saved) as unknown));
      } else {
        const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          const old = JSON.parse(legacy) as { completedLessonIds?: unknown[] };
          setProgress({ ...EMPTY_SAVED_PROGRESS, legacyCompletedCount: Array.isArray(old.completedLessonIds) ? old.completedLessonIds.length : 0 });
        } else {
          setProgress(EMPTY_SAVED_PROGRESS);
        }
      }
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Progress could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const activeMission = MISSIONS.find((mission) => mission.id === activeMissionId) ?? MISSIONS[0];
  const record = getLessonRecord(progress, activeMission.id);
  const worksheet = useMemo(() => getWorksheet(activeMission.id), [activeMission.id]);
  const checks = useMemo(() => getBuildChecks(activeMission.id), [activeMission.id]);
  const webProgress = toWebProgress(progress);
  const completedCount = MISSIONS.filter((mission) => hasLearningGate(webProgress, mission.id)).length;
  const question = activeMission.questions[Math.min(practiceIndex, activeMission.questions.length - 1)];
  const buildCheck = checks[Math.min(buildIndex, checks.length - 1)];
  const secondaryKind: LearningModel['kind'] = buildCheck?.target.kind === 'line' ? 'bar' : 'line';
  const buildReady = !!buildCheck &&
    isCheckCorrect(buildCheck.target, buildCheck.target.kind, primaryBuild) &&
    isCheckCorrect(buildCheck.target, secondaryKind, secondaryBuild);
  const currentWorksheet = worksheet[Math.min(worksheetIndex, worksheet.length - 1)];
  const currentTargeted = useMemo(() => {
    const plans = targetedPracticePlans(activeMission.id, record);
    return plans.flatMap((plan) => plan.problems);
  }, [activeMission.id, record]);
  const currentTargetedProblem = currentTargeted[Math.min(targetedIndex, Math.max(0, currentTargeted.length - 1))];
  const currentProblem = screen === 'targeted' ? currentTargetedProblem : currentWorksheet;
  const isCurrentProblemCorrect = !!currentProblem && record.worksheet[currentProblem.id]?.checkedValue === record.worksheet[currentProblem.id]?.draft
    && answerMatches(currentProblem, record.worksheet[currentProblem.id]?.draft ?? '');
  const currentModelGated = !!currentProblem && gatedWorksheetModel(currentProblem);
  const canCheckWorksheet = !!currentProblem && answerDraft.trim().length > 0 && (!currentModelGated || worksheetModelReady) && !isCurrentProblemCorrect;
  const worksheetCount = worksheetAnswerCount(record, activeMission.id);
  const extraProgress = targetedPracticeCount(activeMission.id, record);
  const lessonComplete = isLessonComplete(progress, activeMission.id);

  const updateRecord = async (missionId: string, nextRecord: LearningRecord) => {
    const next = { ...progress, learning: { ...progress.learning, [missionId]: nextRecord } };
    return persist(next);
  };

  const openMission = (missionId: string) => {
    if (!isLessonOpen(progress, missionId)) return;
    const selectedMission = MISSIONS.find((mission) => mission.id === missionId);
    if (!selectedMission) return;
    const selectedRecord = getLessonRecord(progress, missionId);
    setActiveMissionId(missionId);
    setPracticeIndex(findFirstUnfinishedPractice(missionId, progress));
    setSelectedChoice(null);
    setBuildIndex(getBuildChecks(missionId).findIndex((check) => !selectedRecord.checks[check.id]?.passed));
    setPrimaryBuild(blankBuildState());
    setSecondaryBuild(blankBuildState());
    setSelectedReason(null);
    setBuildSupported(false);
    const sheet = getWorksheet(missionId);
    const nextWorksheet = sheet.findIndex((problem) => {
      const answer = selectedRecord.worksheet[problem.id];
      return !answer || answer.checkedValue !== answer.draft || !answerMatches(problem, answer.draft);
    });
    const plans = targetedPracticePlans(missionId, selectedRecord).flatMap((plan) => plan.problems);
    const nextTargeted = plans.findIndex((problem) => {
      const answer = selectedRecord.worksheet[problem.id];
      return !answer || answer.checkedValue !== answer.draft || !answerMatches(problem, answer.draft);
    });
    const gateProgress = toWebProgress(progress);
    const nextScreen: Screen = hasLearningGate(gateProgress, missionId)
      ? 'complete'
      : !selectedRecord.practiceDone
        ? 'practice'
        : getBuildChecks(missionId).some((check) => !selectedRecord.checks[check.id]?.passed)
          ? 'build'
          : nextWorksheet >= 0
            ? 'worksheet'
            : nextTargeted >= 0
              ? 'targeted'
              : 'complete';
    setTargetedIndex(Math.max(0, nextTargeted));
    const nextSheetIndex = Math.max(0, nextWorksheet);
    const nextExtraIndex = Math.max(0, nextTargeted);
    setWorksheetIndex(nextSheetIndex);
    setAnswerDraft(nextScreen === 'targeted'
      ? selectedRecord.worksheet[plans[nextExtraIndex]?.id]?.draft ?? ''
      : nextScreen === 'worksheet'
        ? selectedRecord.worksheet[sheet[nextSheetIndex]?.id]?.draft ?? ''
        : '');
    setWorksheetModelReady(false);
    setHintVisible(false);
    setResult('idle');
    setScreen(nextScreen);
    void Haptics.selectionAsync();
  };

  const goHome = () => {
    setScreen('home');
    setSelectedChoice(null);
    setAnswerDraft('');
    setResult('idle');
    setHintVisible(false);
  };

  const checkPracticeAnswer = () => {
    if (!question || selectedChoice !== question.correctChoice) {
      setResult('incorrect');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setResult('correct');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const continuePractice = async () => {
    const nextIndex = practiceIndex + 1;
    const nextRecord = nextIndex >= activeMission.questions.length
      ? { ...record, practiceDone: true }
      : record;
    const next = {
      ...progress,
      practiceIndexByMission: { ...progress.practiceIndexByMission, [activeMission.id]: nextIndex },
      learning: { ...progress.learning, [activeMission.id]: nextRecord },
    };
    if (!(await persist(next))) return;
    if (nextIndex >= activeMission.questions.length) {
      const nextBuild = checks.findIndex((check) => !nextRecord.checks[check.id]?.passed);
      setBuildIndex(Math.max(0, nextBuild));
      setPrimaryBuild(blankBuildState());
      setSecondaryBuild(blankBuildState());
      setSelectedReason(null);
      setResult('idle');
      setScreen('build');
    } else {
      setPracticeIndex(nextIndex);
      setSelectedChoice(null);
      setResult('idle');
    }
  };

  const submitBuild = async () => {
    if (!buildCheck || !buildReady || selectedReason === null) return;
    const previous = record.checks[buildCheck.id];
    if (selectedReason !== buildCheck.correctReason) {
      const reasonSignal = 'Picking the reason';
      const failed: LearningRecord = {
        ...record,
        helpUses: record.helpUses + 1,
        misconceptions: { ...record.misconceptions, [reasonSignal]: (record.misconceptions[reasonSignal] ?? 0) + 1 },
        checks: { ...record.checks, [buildCheck.id]: { passed: false, supported: true, attempts: (previous?.attempts ?? 0) + 1 } },
      };
      await updateRecord(activeMission.id, failed);
      setBuildSupported(true);
      setResult('incorrect');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const nextRecord: LearningRecord = {
      ...record,
      checks: { ...record.checks, [buildCheck.id]: { passed: true, supported: !!previous?.supported || buildSupported, attempts: (previous?.attempts ?? 0) + 1 } },
    };
    const next = { ...progress, learning: { ...progress.learning, [activeMission.id]: nextRecord } };
    if (!(await persist(next))) return;
    setResult('idle');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const nextIndex = checks.findIndex((check) => !nextRecord.checks[check.id]?.passed);
    if (nextIndex >= 0) {
      setBuildIndex(nextIndex);
      setPrimaryBuild(blankBuildState());
      setSecondaryBuild(blankBuildState());
      setSelectedReason(null);
      setBuildSupported(false);
      setHintVisible(false);
    } else {
      setWorksheetIndex(0);
      setResult('idle');
      setScreen('worksheet');
    }
  };

  const updateWorksheetDraft = (problem: WorksheetProblem, draft: string) => {
    setAnswerDraft(draft);
    setResult('idle');
    const prior = record.worksheet[problem.id] ?? { draft: '', attempts: 0, supported: false };
    const nextRecord: LearningRecord = {
      ...record,
      worksheet: {
        ...record.worksheet,
        [problem.id]: { ...prior, draft, checkedValue: undefined },
      },
      confirmedAt: undefined,
    };
    void updateRecord(activeMission.id, nextRecord);
  };

  const checkWorksheetAnswer = async (problem: WorksheetProblem, isTargeted: boolean) => {
    if (!problem || !answerDraft.trim() || (gatedWorksheetModel(problem) && !worksheetModelReady)) return;
    const base = record.worksheet[problem.id] ?? { draft: answerDraft, attempts: 0, supported: false };
    const withDraft = { ...record, worksheet: { ...record.worksheet, [problem.id]: { ...base, draft: answerDraft } } };
    const nextRecord = checkWorksheet(withDraft, problem, !isTargeted);
    if (!(await updateRecord(activeMission.id, nextRecord))) return;
    if (answerMatches(problem, answerDraft)) {
      setResult('correct');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setResult('incorrect');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const continueWorksheet = (isTargeted: boolean) => {
    const nextIndex = isTargeted
      ? currentTargeted.findIndex((problem) => {
        const entry = record.worksheet[problem.id];
        return !entry || entry.checkedValue !== entry.draft || !answerMatches(problem, entry.draft);
      })
      : worksheet.findIndex((problem) => {
        const entry = record.worksheet[problem.id];
        return !entry || entry.checkedValue !== entry.draft || !answerMatches(problem, entry.draft);
      });
    if (isTargeted) {
      if (nextIndex >= 0) {
        setTargetedIndex(nextIndex);
        setAnswerDraft(record.worksheet[currentTargeted[nextIndex].id]?.draft ?? '');
        setWorksheetModelReady(false);
        setResult('idle');
        setHintVisible(false);
      } else {
        setScreen('complete');
      }
      return;
    }
    if (nextIndex >= 0) {
      setWorksheetIndex(nextIndex);
      setAnswerDraft(record.worksheet[worksheet[nextIndex].id]?.draft ?? '');
      setWorksheetModelReady(false);
      setResult('idle');
      setHintVisible(false);
    } else {
      const plans = targetedPracticePlans(activeMission.id, record).flatMap((plan) => plan.problems);
      const pendingExtra = plans.findIndex((problem) => {
        const entry = record.worksheet[problem.id];
        return !entry || entry.checkedValue !== entry.draft || !answerMatches(problem, entry.draft);
      });
      if (pendingExtra >= 0) {
        setTargetedIndex(pendingExtra);
        setAnswerDraft(record.worksheet[plans[pendingExtra].id]?.draft ?? '');
        setWorksheetModelReady(false);
        setHintVisible(false);
        setScreen('targeted');
      } else {
        setScreen('complete');
      }
    }
  };

  const showHint = async (problem: WorksheetProblem) => {
    setHintVisible(true);
    const prior = record.worksheet[problem.id] ?? { draft: '', attempts: 0, supported: false };
    await updateRecord(activeMission.id, {
      ...record,
      helpUses: record.helpUses + 1,
      worksheet: { ...record.worksheet, [problem.id]: { ...prior, supported: true } },
    });
  };

  if (loading) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
        <StatusBar barStyle={colors.background === '#141d2c' ? 'light-content' : 'dark-content'} />
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.body}>Loading your fraction trail…</Text>
      </View>
    );
  }

  if (storageError && !progress.legacyCompletedCount && completedCount === 0 && Object.keys(progress.learning).length === 0) {
    return (
      <View style={[styles.screen, styles.errorScreen, { paddingTop: topInset + 20, paddingBottom: bottomInset + 20 }]}>
        <Feather name="alert-circle" size={35} color={colors.destructive} />
        <Text style={styles.errorTitle}>Your progress didn’t load</Text>
        <Text style={styles.errorCopy}>{storageError}</Text>
        <Pressable accessibilityRole="button" onPress={() => void reload()} style={styles.button}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (screen === 'home') {
    return (
      <ScrollView style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: topInset + 12, paddingBottom: bottomInset + 34 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={styles.brand}>
            <Image source={require('../assets/images/icon.png')} contentFit="cover" style={styles.brandIcon} accessibilityLabel="Fraction Quest icon" />
            <Text style={styles.brandName}>Fraction Quest</Text>
          </View>
          <View style={styles.profileBadge} accessibilityLabel="Your local learning profile">
            <Feather name="smile" size={20} color={colors.secondary} />
          </View>
        </View>
        <View>
          <Text style={styles.eyebrow}>A little practice, a lot of “aha!”</Text>
          <Text style={styles.title}>Your fraction adventure starts here.</Text>
          <Text style={[styles.body, { marginTop: 8 }]}>Explore the complete fraction course. Build models, answer each lesson’s questions, and keep your progress on this iPhone.</Text>
        </View>
        <View style={styles.progressCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.progressTitle}>Your fraction course</Text>
              <Text style={styles.progressCopy}>{completedCount === MISSIONS.length ? 'Every lesson complete' : `${completedCount} of ${MISSIONS.length} lessons complete`}</Text>
            </View>
            <Text style={styles.progressCount}>{completedCount}/{MISSIONS.length}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(completedCount / MISSIONS.length) * 100}%` }]} />
          </View>
        </View>
        <View>
          <Text style={styles.sectionHeading}>The lesson path</Text>
          <Text style={styles.sectionSubheading}>Finish the lesson practice, both model builds, and all 12 worksheet answers to open what comes next.</Text>
        </View>
        {UNIT_INFO.map((unit, unitIndex) => {
          const unitMissions = MISSIONS.filter((mission) => mission.unit === unitIndex + 1);
          if (!unitMissions.length) return null;
          const finished = unitMissions.filter((mission) => isLessonComplete(progress, mission.id)).length;
          return (
            <View key={unitIndex} style={styles.unitCard}>
              <View style={styles.unitHeading}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.unitKicker}>Unit {unitIndex + 1}</Text>
                  <Text style={styles.unitTitle}>{unit.title}</Text>
                  <Text style={styles.unitSubtitle}>{unit.subtitle}</Text>
                </View>
                <Text accessibilityLabel={`${finished} of ${unitMissions.length} lessons mastered`} style={styles.unitCount}>{finished}/{unitMissions.length}</Text>
              </View>
              {unitMissions.map((mission) => {
                const unlocked = isLessonOpen(progress, mission.id);
                const complete = isLessonComplete(progress, mission.id);
                const lessonRecord = getLessonRecord(progress, mission.id);
                const rows = worksheetAnswerCount(lessonRecord, mission.id);
                const checksDone = getBuildChecks(mission.id).filter((check) => lessonRecord.checks[check.id]?.passed).length;
                const questionsDone = lessonRecord.practiceDone ? mission.questions.length : progress.practiceIndexByMission[mission.id] ?? 0;
                const isTeal = mission.unit % 2 === 0;
                return (
                  <View key={mission.id} style={[styles.lessonItem, !unlocked && styles.lessonLocked]}>
                    <View style={styles.lessonRow}>
                      <View style={styles.lessonNumber}>
                        {complete ? <Feather name="check" size={16} color={colors.success} /> : unlocked ? <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{String(MISSIONS.indexOf(mission) + 1).padStart(2, '0')}</Text> : <Feather name="lock" size={14} color={colors.mutedForeground} />}
                      </View>
                      <View style={styles.lessonText}>
                        <Text style={styles.lessonName}>{mission.title}</Text>
                        <Text style={styles.lessonDescription}>{mission.description}</Text>
                      </View>
                      <Pressable testID={`lesson-card-${mission.id}`} accessibilityRole="button"
                        accessibilityLabel={`${mission.title}, ${complete ? 'complete' : unlocked ? 'available' : 'locked'}`}
                        accessibilityState={{ disabled: !unlocked }} disabled={!unlocked} onPress={() => openMission(mission.id)}
                        style={({ pressed }) => [styles.lessonAction, isTeal && unlocked && styles.lessonActionTeal, !unlocked && styles.lessonActionLocked, pressed && { opacity: 0.78 }]}>
                        <Text style={[styles.lessonActionText, !unlocked && styles.lessonActionLockedText]}>{complete ? 'Review' : unlocked ? 'Open' : 'Locked'}</Text>
                        <Feather name={complete ? 'rotate-ccw' : unlocked ? 'arrow-right' : 'lock'} size={14} color={!unlocked ? colors.mutedForeground : colors.primaryForeground} />
                      </Pressable>
                    </View>
                    <Text style={styles.lessonProgress}>
                      {complete ? 'Complete' : !unlocked ? `Finish earlier lessons first · ${questionsDone}/${mission.questions.length} practice · ${checksDone}/2 builds · ${rows}/12 worksheet` : `${questionsDone}/${mission.questions.length} practice · ${checksDone}/2 builds · ${rows}/12 worksheet`}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
        {progress.legacyCompletedCount > 0 && (
          <View style={styles.note}>
            <Feather name="archive" size={18} color={colors.foreground} />
            <Text style={[styles.body, { flex: 1 }]}>
              Your earlier starter-trail record ({progress.legacyCompletedCount} completed lesson{progress.legacyCompletedCount === 1 ? '' : 's'}) is preserved. It stays separate from the full-course mastery checks.
            </Text>
          </View>
        )}
        {!!storageError && <View style={styles.feedback}><Feather name="alert-triangle" size={18} color={colors.destructive} /><Text style={styles.feedbackText}>{storageError}</Text></View>}
        <View style={styles.note}>
          <Feather name="smartphone" size={18} color={colors.foreground} />
          <Text style={[styles.body, { flex: 1 }]}>Progress is saved on this device. Each lesson stays locked until its practice, model checks, worksheet, and any extra practice are complete.</Text>
        </View>
      </ScrollView>
    );
  }

  if (screen === 'practice' && question) {
    const correctAnswerShown = result === 'correct';
    return (
      <KeyboardAwareScrollViewCompat style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: topInset + 10, paddingBottom: bottomInset + 26 }]} keyboardShouldPersistTaps="handled" bottomOffset={20}>
        <LessonHeader styles={styles} mission={activeMission} label={`LESSON ${MISSIONS.indexOf(activeMission) + 1} · PRACTICE`} count={`${practiceIndex + 1}/${activeMission.questions.length}`} onBack={goHome} />
        <ProgressMeter styles={styles} progress={(practiceIndex / activeMission.questions.length) * 100} />
        <Text style={styles.question}>{question.prompt}</Text>
        <ModelPreview model={question.model} />
        <View style={{ gap: 9 }}>
          {question.choices.map((choice, index) => (
            <Pressable key={`${question.id}-${index}`} accessibilityRole="radio" accessibilityState={{ selected: selectedChoice === index }}
              disabled={correctAnswerShown} onPress={() => { setSelectedChoice(index); setResult('idle'); }}
              style={[styles.option, selectedChoice === index && styles.optionSelected]}>
              <Feather name={selectedChoice === index ? 'check-circle' : 'circle'} size={19} color={selectedChoice === index ? colors.primary : colors.mutedForeground} />
              <Text style={styles.optionText}>{choice}</Text>
            </Pressable>
          ))}
        </View>
        <PrimaryAction styles={styles} label={correctAnswerShown ? practiceIndex + 1 >= activeMission.questions.length ? 'Start model builds' : 'Next question' : 'Check answer'}
          disabled={selectedChoice === null && !correctAnswerShown}
          onPress={correctAnswerShown ? () => void continuePractice() : checkPracticeAnswer} />
        {result === 'incorrect' && <Feedback styles={styles} text={question.retryFeedback || question.hint} />}
        {correctAnswerShown && <Feedback styles={styles} good text="That answer is right. Keep going." />}
        {!!storageError && <Feedback styles={styles} text={storageError} />}
      </KeyboardAwareScrollViewCompat>
    );
  }

  if (screen === 'build' && buildCheck) {
    const primaryCorrect = isCheckCorrect(buildCheck.target, buildCheck.target.kind, primaryBuild);
    const secondaryCorrect = isCheckCorrect(buildCheck.target, secondaryKind, secondaryBuild);
    const reasonReady = primaryCorrect && secondaryCorrect;
    const reasonOptions = buildCheck.reasons;
    return (
      <KeyboardAwareScrollViewCompat style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: topInset + 10, paddingBottom: bottomInset + 26 }]} keyboardShouldPersistTaps="handled" bottomOffset={20}>
        <LessonHeader styles={styles} mission={activeMission} label={buildCheck.transfer ? 'STEP 2 · ON YOUR OWN' : 'STEP 1 · BUILD IT'} count={`${buildIndex + 1}/2`} onBack={goHome} />
        <ProgressMeter styles={styles} progress={(buildIndex / checks.length) * 100} />
        <Text style={styles.question}>{buildCheck.prompt}</Text>
        <ModelBuilder check={buildCheck} kind={buildCheck.target.kind} value={primaryBuild} onChange={(value) => { setPrimaryBuild(value); setSelectedReason(null); setResult('idle'); }} title={`Build it ${buildCheck.target.kind === 'set' ? 'with equal groups' : buildCheck.target.kind === 'line' ? 'on a number line' : 'with a bar model'}`} />
        <View style={styles.feedbackGood}>
          <Text style={styles.feedbackText}>{primaryCorrect ? `${buildCheck.target.n}/${buildCheck.target.d} is built in this model.` : 'Match the equal parts and selected amount to the prompt.'}</Text>
        </View>
        {primaryCorrect ? (
          <>
            <View style={{ gap: 6 }}>
              <Text style={styles.sectionHeading}>Show the same amount another way</Text>
              <Text style={styles.sectionSubheading}>{secondaryKind === 'line' ? 'Now place it on a number line.' : 'Now show it with a bar model.'}</Text>
            </View>
            <ModelBuilder check={buildCheck} kind={secondaryKind} value={secondaryBuild} onChange={(value) => { setSecondaryBuild(value); setSelectedReason(null); setResult('idle'); }} title={secondaryKind === 'line' ? 'Number line' : 'Bar model'} />
          </>
        ) : null}
        {reasonReady && secondaryCorrect && (
          <>
            <Text style={styles.sectionHeading}>Which idea explains why?</Text>
            {reasonOptions.map((reason, index) => (
              <Pressable key={`${buildCheck.id}-reason-${index}`} accessibilityRole="radio" accessibilityState={{ selected: selectedReason === index }}
                onPress={() => { setSelectedReason(index); setResult('idle'); }} style={[styles.option, selectedReason === index && styles.optionSelected]}>
                <Feather name={selectedReason === index ? 'check-circle' : 'circle'} size={19} color={selectedReason === index ? colors.primary : colors.mutedForeground} />
                <Text style={styles.optionText}>{reason}</Text>
              </Pressable>
            ))}
          </>
        )}
        <Pressable accessibilityRole="button" onPress={() => { setHintVisible(true); setBuildSupported(true); void updateRecord(activeMission.id, { ...record, helpUses: record.helpUses + 1 }); }} style={styles.secondaryButton}>
          <Feather name="help-circle" size={17} color={colors.secondary} /><Text style={styles.secondaryButtonText}>Need a hint?</Text>
        </Pressable>
        {hintVisible && <Feedback styles={styles} text={`Split each whole into ${buildCheck.target.d} equal ${buildCheck.target.kind === 'line' ? 'spaces' : buildCheck.target.kind === 'set' ? 'groups' : 'parts'}, then ${buildCheck.target.kind === 'line' ? 'mark' : buildCheck.target.kind === 'set' ? 'select' : 'shade'} ${buildCheck.target.n}.`} />}
        <PrimaryAction styles={styles} label="Check model and reason" disabled={!reasonReady || selectedReason === null} onPress={() => void submitBuild()} />
        {result === 'incorrect' && <Feedback styles={styles} text="That reason does not match both models yet. Try another choice." />}
        {result === 'correct' && <Feedback styles={styles} good text={buildCheck.explanation} />}
        {!!storageError && <Feedback styles={styles} text={storageError} />}
      </KeyboardAwareScrollViewCompat>
    );
  }

  if ((screen === 'worksheet' || screen === 'targeted') && currentProblem) {
    const isTargeted = screen === 'targeted';
    const entry = record.worksheet[currentProblem.id];
    const answerAlreadyCorrect = !!entry && entry.checkedValue === entry.draft && answerMatches(currentProblem, entry.draft);
    const submittedCorrect = result === 'correct' || answerAlreadyCorrect;
    const localDraft = answerDraft !== '' ? answerDraft : entry?.draft ?? '';
    const enteredCount = isTargeted ? extraProgress.done : worksheetCount;
    const totalCount = isTargeted ? extraProgress.total : worksheet.length;
    return (
      <KeyboardAwareScrollViewCompat key={`${activeMission.id}-${currentProblem.id}`} style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: topInset + 10, paddingBottom: bottomInset + 26 }]} keyboardShouldPersistTaps="handled" bottomOffset={20}>
        <LessonHeader styles={styles} mission={activeMission} label={isTargeted ? 'EXTRA PRACTICE' : 'WORKSHEET'} count={`${enteredCount}/${totalCount}`} onBack={goHome} />
        <ProgressMeter styles={styles} progress={(enteredCount / Math.max(totalCount, 1)) * 100} />
        <View style={styles.card}>
          <Text style={styles.eyebrow}>{isTargeted ? 'One idea needs another try' : `Question ${worksheetIndex + 1} of ${worksheet.length}`}</Text>
          <Text style={styles.question}>{currentProblem.prompt}</Text>
        </View>
        <WorksheetModelInput key={currentProblem.id} problem={currentProblem} disabled={submittedCorrect}
          onReady={setWorksheetModelReady} />
        <View style={{ gap: 8 }}>
          <Text style={styles.sectionSubheading}>Build your answer with tiles</Text>
          <AnswerTileBuilder key={currentProblem.id} problem={currentProblem} value={localDraft}
            onChange={(value) => updateWorksheetDraft(currentProblem, value)} disabled={submittedCorrect} />
        </View>
        <PrimaryAction styles={styles}
          label={submittedCorrect ? isTargeted ? 'Next extra check' : 'Next question' : 'Check answer'}
          disabled={submittedCorrect ? false : !canCheckWorksheet}
          onPress={submittedCorrect ? () => continueWorksheet(isTargeted) : () => void checkWorksheetAnswer(currentProblem, isTargeted)} />
        {result === 'incorrect' && <Feedback styles={styles} text={currentProblem.hint || 'Not quite yet. Try again.'} />}
        {submittedCorrect && <Feedback styles={styles} good text="That answer is correct. Your work is saved." />}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: hintVisible }} onPress={() => void showHint(currentProblem)} style={styles.secondaryButton}>
          <Feather name="help-circle" size={17} color={colors.secondary} /><Text style={styles.secondaryButtonText}>{hintVisible ? 'Hint shown' : 'Need a hint?'}</Text>
        </Pressable>
        {hintVisible && <Feedback styles={styles} text={currentProblem.hint} />}
        {!!storageError && <Feedback styles={styles} text={storageError} />}
        <View style={styles.note}>
          <Feather name="check-square" size={17} color={colors.foreground} />
          <Text style={[styles.body, { flex: 1 }]}>{isTargeted ? `${enteredCount} of ${totalCount} extra answers checked.` : `${worksheetCount} of 12 worksheet answers checked.`} You can leave and return; checked work remains saved.</Text>
        </View>
      </KeyboardAwareScrollViewCompat>
    );
  }

  if (screen === 'complete' || lessonComplete) {
    const unitLessons = MISSIONS.filter((mission) => mission.unit === activeMission.unit);
    const nextMission = MISSIONS[MISSIONS.indexOf(activeMission) + 1];
    const nextIsOpen = !!nextMission && isLessonOpen(progress, nextMission.id);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: topInset + 10, paddingBottom: bottomInset + 30 }]}>
        <LessonHeader styles={styles} mission={activeMission} label={`UNIT ${activeMission.unit} COMPLETE`} count={`${unitLessons.filter((mission) => isLessonComplete(progress, mission.id)).length}/${unitLessons.length}`} onBack={goHome} />
        <View style={[styles.progressCard, { alignItems: 'center', paddingVertical: 28 }]}>
          <Feather name="award" size={42} color={colors.accent} />
          <Text style={[styles.progressTitle, { fontSize: 21, textAlign: 'center', marginTop: 10 }]}>{activeMission.title} complete!</Text>
          <Text style={[styles.progressCopy, { textAlign: 'center', lineHeight: 20 }]}>Your practice, model builds, and worksheet are saved. {nextIsOpen ? 'The next lesson is unlocked.' : 'You can keep exploring the course path.'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Lesson evidence</Text>
          <Text style={styles.body}>Practice: complete</Text>
          <Text style={styles.body}>Model builds: {checks.filter((check) => record.checks[check.id]?.passed).length} of {checks.length}</Text>
          <Text style={styles.body}>Worksheet: {worksheetCount} of 12</Text>
          {extraProgress.total > 0 && <Text style={styles.body}>Extra practice: {extraProgress.done} of {extraProgress.total}</Text>}
        </View>
        <PrimaryAction styles={styles} label={nextIsOpen && nextMission ? `Continue to ${nextMission.title}` : 'Back to lesson path'} onPress={() => nextIsOpen && nextMission ? openMission(nextMission.id) : goHome()} />
        <Pressable onPress={goHome} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>View all units and lessons</Text></Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.screen, styles.errorScreen]}>
      <Feather name="alert-circle" size={35} color={colors.destructive} />
      <Text style={styles.errorTitle}>This lesson is not available yet</Text>
      <Text style={styles.errorCopy}>Finish the earlier lessons first, then come back to this one.</Text>
      <Pressable accessibilityRole="button" onPress={goHome} style={styles.button}><Text style={styles.buttonText}>Back to lesson path</Text></Pressable>
    </View>
  );
}

function LessonHeader({ styles, mission, label, count, onBack }: {
  styles: ReturnType<typeof useStyles>; mission: (typeof MISSIONS)[number]; label: string; count: string; onBack: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.header}>
      <Pressable testID="lesson-back" accessibilityRole="button" accessibilityLabel="Back to lessons" onPress={onBack} style={styles.back}>
        <Feather name="arrow-left" size={20} color={colors.foreground} />
      </Pressable>
      <View style={styles.headerMain}>
        <Text style={styles.stepLabel}>{label}</Text>
        <Text style={styles.headerTitle} numberOfLines={2}>{mission.title}</Text>
      </View>
      <Text style={styles.stat}>{count}</Text>
    </View>
  );
}

function ProgressMeter({ styles, progress }: { styles: ReturnType<typeof useStyles>; progress: number }) {
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }} style={styles.meter}><View style={[styles.meterFill, { width: `${Math.max(0, Math.min(100, progress))}%` }]} /></View>;
}

function PrimaryAction({ styles, label, disabled = false, onPress }: { styles: ReturnType<typeof useStyles>; label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, disabled && styles.buttonDisabled, pressed && { opacity: 0.85 }]}>
      <Text style={styles.buttonText}>{label}</Text><Feather name="arrow-right" size={18} color="white" />
    </Pressable>
  );
}

function Feedback({ styles, text, good = false }: { styles: ReturnType<typeof useStyles>; text: string; good?: boolean }) {
  const colors = useColors();
  return (
    <View accessibilityLiveRegion="polite" style={[styles.feedback, good && styles.feedbackGood]}>
      <Feather name={good ? 'check-circle' : 'info'} size={18} color={good ? colors.success : colors.primary} />
      <Text style={styles.feedbackText}>{text}</Text>
    </View>
  );
}
