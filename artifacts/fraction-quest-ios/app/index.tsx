import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

type FractionProblem = {
  numerator: number;
  denominator: number;
};

type Lesson = {
  id: string;
  title: string;
  unit: string;
  description: string;
  model: 'bar' | 'set';
  questions: FractionProblem[];
  transfer: FractionProblem;
  tint: 'coral' | 'teal';
};

type SavedProgress = {
  completedLessonIds: string[];
  worksheetAnswers: Record<string, string[]>;
};

const STORAGE_KEY = 'fraction-quest-ios-progress-v1';
const WORKSHEET_SIZE = 10;

const LESSONS: Lesson[] = [
  {
    id: 'equal-parts',
    title: 'Make equal parts',
    unit: 'Meet fractions',
    description: 'Split one whole into fair, equal pieces.',
    model: 'bar',
    tint: 'coral',
    questions: [
      { numerator: 1, denominator: 2 },
      { numerator: 2, denominator: 3 },
      { numerator: 3, denominator: 4 },
      { numerator: 1, denominator: 4 },
      { numerator: 3, denominator: 5 },
      { numerator: 5, denominator: 6 },
      { numerator: 3, denominator: 8 },
      { numerator: 4, denominator: 5 },
      { numerator: 5, denominator: 8 },
      { numerator: 2, denominator: 6 },
    ],
    transfer: { numerator: 4, denominator: 6 },
  },
  {
    id: 'fractions-in-groups',
    title: 'Find a part of a group',
    unit: 'Fractions in groups',
    description: 'Show equal shares in a collection.',
    model: 'set',
    tint: 'teal',
    questions: [
      { numerator: 2, denominator: 4 },
      { numerator: 1, denominator: 3 },
      { numerator: 3, denominator: 5 },
      { numerator: 4, denominator: 6 },
      { numerator: 2, denominator: 5 },
      { numerator: 5, denominator: 8 },
      { numerator: 3, denominator: 4 },
      { numerator: 4, denominator: 8 },
      { numerator: 5, denominator: 6 },
      { numerator: 3, denominator: 8 },
    ],
    transfer: { numerator: 2, denominator: 3 },
  },
];

const EMPTY_PROGRESS: SavedProgress = {
  completedLessonIds: [],
  worksheetAnswers: {},
};

const TRANSFER_STEP = WORKSHEET_SIZE;

function cleanProgress(value: unknown): SavedProgress {
  if (!value || typeof value !== 'object') {
    throw new Error('Saved progress is not in a readable format.');
  }
  const raw = value as Partial<SavedProgress>;
  if (!Array.isArray(raw.completedLessonIds) || !raw.worksheetAnswers || typeof raw.worksheetAnswers !== 'object') {
    throw new Error('Saved progress is missing required learning records.');
  }
  const validIds = new Set(LESSONS.map((lesson) => lesson.id));
  const completedLessonIds = raw.completedLessonIds.filter(
    (id): id is string => typeof id === 'string' && validIds.has(id),
  );
  const worksheetAnswers: Record<string, string[]> = {};
  for (const lesson of LESSONS) {
    const answers = raw.worksheetAnswers[lesson.id];
    if (answers !== undefined && !Array.isArray(answers)) {
      throw new Error('A saved worksheet could not be read.');
    }
    worksheetAnswers[lesson.id] = (answers ?? [])
      .filter((answer): answer is string => typeof answer === 'string')
      .slice(0, WORKSHEET_SIZE);
  }
  return { completedLessonIds, worksheetAnswers };
}

async function readProgress(): Promise<SavedProgress> {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  return saved ? cleanProgress(JSON.parse(saved) as unknown) : EMPTY_PROGRESS;
}

function sameFraction(
  numeratorText: string,
  denominatorText: string,
  expected: FractionProblem,
): boolean {
  const numerator = Number(numeratorText);
  const denominator = Number(denominatorText);
  return (
    numeratorText.trim() !== '' &&
    denominatorText.trim() !== '' &&
    Number.isSafeInteger(numerator) &&
    Number.isSafeInteger(denominator) &&
    numerator >= 0 &&
    denominator > 0 &&
    numerator * expected.denominator === expected.numerator * denominator
  );
}

function useStyles() {
  const colors = useColors();
  return useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        scrollContent: {
          paddingHorizontal: 20,
          paddingBottom: 36,
          gap: 22,
        },
        brandRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 8,
        },
        brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        brandIcon: { width: 38, height: 38, borderRadius: 12 },
        brandName: { color: colors.foreground, fontSize: 18, fontFamily: 'BricolageGrotesque_700Bold' },
        profileBadge: {
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        eyebrow: {
          color: colors.secondary,
          fontSize: 12,
          fontFamily: 'BricolageGrotesque_700Bold',
          textTransform: 'uppercase',
          letterSpacing: 1.1,
        },
        heroTitle: {
          color: colors.foreground,
          fontSize: 33,
          lineHeight: 39,
          fontFamily: 'BricolageGrotesque_700Bold',
          letterSpacing: -0.8,
          marginTop: 7,
        },
        body: {
          color: colors.mutedForeground,
          fontSize: 15,
          lineHeight: 22,
          fontFamily: 'BricolageGrotesque_400Regular',
        },
        heroBody: { marginTop: 8, maxWidth: 310 },
        progressCard: {
          padding: 19,
          borderRadius: colors.radius,
          backgroundColor: colors.secondary,
          overflow: 'hidden',
        },
        progressTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
        progressTitle: {
          color: colors.secondaryForeground,
          fontSize: 16,
          fontFamily: 'BricolageGrotesque_600SemiBold',
        },
        progressCopy: {
          color: colors.secondaryForeground,
          opacity: 0.82,
          fontSize: 13,
          marginTop: 4,
          fontFamily: 'BricolageGrotesque_400Regular',
        },
        progressCount: {
          color: colors.secondaryForeground,
          fontSize: 30,
          fontFamily: 'BricolageGrotesque_700Bold',
          lineHeight: 34,
        },
        progressTrack: {
          height: 8,
          backgroundColor: 'rgba(255,255,255,0.24)',
          borderRadius: 8,
          marginTop: 18,
          overflow: 'hidden',
        },
        progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 8 },
        sectionHeading: {
          color: colors.foreground,
          fontSize: 22,
          fontFamily: 'BricolageGrotesque_700Bold',
          letterSpacing: -0.35,
        },
        sectionSubheading: { color: colors.mutedForeground, fontSize: 14, marginTop: 4 },
        lessonList: { gap: 12, marginTop: 14 },
        lessonCard: {
          padding: 17,
          borderRadius: colors.radius,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          gap: 14,
        },
        lessonCardPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
        lessonCardLocked: { opacity: 0.72 },
        lessonCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
        lessonIcon: {
          width: 46,
          height: 46,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
        lessonIconCoral: { backgroundColor: colors.coralSoft },
        lessonIconTeal: { backgroundColor: colors.tealSoft },
        lessonText: { flex: 1, gap: 3 },
        lessonUnit: {
          color: colors.mutedForeground,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          fontFamily: 'BricolageGrotesque_600SemiBold',
        },
        lessonTitle: {
          color: colors.foreground,
          fontSize: 18,
          fontFamily: 'BricolageGrotesque_700Bold',
        },
        lessonCopy: { color: colors.mutedForeground, fontSize: 13, lineHeight: 19 },
        cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        statusPill: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: 99,
          backgroundColor: colors.muted,
        },
        statusText: {
          color: colors.mutedForeground,
          fontSize: 12,
          fontFamily: 'BricolageGrotesque_600SemiBold',
        },
        statusComplete: { backgroundColor: colors.tealSoft },
        statusCompleteText: { color: colors.success },
        cardAction: {
          minHeight: 44,
          minWidth: 92,
          paddingHorizontal: 16,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 7,
          backgroundColor: colors.primary,
        },
        cardActionTeal: { backgroundColor: colors.secondary },
        cardActionDisabled: { backgroundColor: colors.muted },
        cardActionText: {
          color: colors.primaryForeground,
          fontSize: 14,
          fontFamily: 'BricolageGrotesque_700Bold',
        },
        cardActionDisabledText: { color: colors.mutedForeground },
        noteCard: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 11,
          padding: 15,
          borderRadius: 18,
          backgroundColor: colors.goldSoft,
        },
        noteText: { flex: 1, color: colors.foreground, fontSize: 13, lineHeight: 19 },
        screenHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 13,
          marginTop: 8,
        },
        backButton: {
          width: 44,
          height: 44,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        lessonHeaderText: { flex: 1, gap: 2 },
        stepLabel: {
          color: colors.secondary,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 0.9,
          fontFamily: 'BricolageGrotesque_700Bold',
        },
        lessonHeaderTitle: {
          color: colors.foreground,
          fontSize: 21,
          fontFamily: 'BricolageGrotesque_700Bold',
        },
        lessonProgressTrack: {
          height: 7,
          borderRadius: 7,
          backgroundColor: colors.muted,
          overflow: 'hidden',
          marginTop: 5,
        },
        modelCard: {
          padding: 18,
          borderRadius: colors.radius,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 17,
        },
        modelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        modelLabel: {
          color: colors.mutedForeground,
          fontSize: 11,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          fontFamily: 'BricolageGrotesque_700Bold',
        },
        modelCount: { color: colors.secondary, fontSize: 12, fontFamily: 'BricolageGrotesque_600SemiBold' },
        wholeLabel: { color: colors.foreground, fontSize: 12, fontFamily: 'BricolageGrotesque_600SemiBold' },
        barRow: { flexDirection: 'row', gap: 4 },
        barPart: {
          flex: 1,
          height: 59,
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.background,
        },
        barPartSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
        setGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingVertical: 3 },
        setPiece: {
          width: 39,
          height: 39,
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        },
        setPieceSelected: { backgroundColor: colors.secondary, borderColor: colors.secondary },
        prompt: {
          color: colors.foreground,
          fontSize: 23,
          lineHeight: 30,
          fontFamily: 'BricolageGrotesque_700Bold',
          letterSpacing: -0.35,
        },
        inputLabel: {
          color: colors.mutedForeground,
          fontSize: 12,
          fontFamily: 'BricolageGrotesque_600SemiBold',
          marginBottom: 9,
        },
        fractionInputs: { flexDirection: 'row', alignItems: 'center', gap: 11 },
        fractionInput: {
          width: 76,
          height: 58,
          textAlign: 'center',
          fontSize: 22,
          color: colors.foreground,
          backgroundColor: colors.card,
          borderWidth: 1.5,
          borderColor: colors.border,
          borderRadius: 15,
          fontFamily: 'BricolageGrotesque_700Bold',
        },
        fractionSlash: { width: 28, height: 2, backgroundColor: colors.foreground },
        helpRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
        helpText: { flex: 1, color: colors.mutedForeground, fontSize: 13, lineHeight: 19 },
        feedback: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 9,
          padding: 12,
          borderRadius: 14,
          backgroundColor: colors.coralSoft,
        },
        feedbackCorrect: { backgroundColor: colors.tealSoft },
        feedbackText: { flex: 1, color: colors.foreground, fontSize: 14, lineHeight: 20 },
        primaryButton: {
          minHeight: 56,
          borderRadius: 17,
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 10,
          backgroundColor: colors.primary,
        },
        primaryButtonPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
        primaryButtonDisabled: { opacity: 0.48 },
        primaryButtonText: {
          color: colors.primaryForeground,
          fontSize: 16,
          fontFamily: 'BricolageGrotesque_700Bold',
        },
        errorScreen: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 26,
          gap: 14,
        },
        errorTitle: {
          color: colors.foreground,
          textAlign: 'center',
          fontSize: 23,
          fontFamily: 'BricolageGrotesque_700Bold',
        },
        errorCopy: { color: colors.mutedForeground, textAlign: 'center', fontSize: 15, lineHeight: 22 },
      }),
    [
      colors.accent,
      colors.background,
      colors.border,
      colors.card,
      colors.coralSoft,
      colors.foreground,
      colors.goldSoft,
      colors.input,
      colors.muted,
      colors.mutedForeground,
      colors.primary,
      colors.primaryForeground,
      colors.radius,
      colors.secondary,
      colors.secondaryForeground,
      colors.success,
      colors.tealSoft,
    ],
  );
}

function ProgressBar({ progress, style }: { progress: number; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return (
    <View style={[{ height: 8, borderRadius: 8, backgroundColor: colors.muted, overflow: 'hidden' }, style]}>
      <View
        style={{
          width: `${Math.max(0, Math.min(100, progress))}%`,
          height: '100%',
          backgroundColor: colors.primary,
          borderRadius: 8,
        }}
      />
    </View>
  );
}

function FractionModel({
  lesson,
  problem,
  selected,
  onToggle,
}: {
  lesson: Lesson;
  problem: FractionProblem;
  selected: number[];
  onToggle: (index: number) => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const selectedSet = new Set(selected);

  return (
    <View style={styles.modelCard}>
      <View style={styles.modelHeader}>
        <Text style={styles.modelLabel}>Build your model</Text>
        <Text style={styles.modelCount}>
          {selected.length} of {problem.denominator} selected
        </Text>
      </View>
      <Text style={styles.wholeLabel}>{lesson.model === 'bar' ? 'ONE WHOLE' : 'ONE GROUP'}</Text>
      {lesson.model === 'bar' ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={`${problem.denominator} equal parts`}
          style={styles.barRow}
        >
          {Array.from({ length: problem.denominator }, (_, index) => {
            const active = selectedSet.has(index);
            return (
              <Pressable
                key={index}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Part ${index + 1} of ${problem.denominator}${active ? ', shaded' : ', not shaded'}`}
                testID={`model-part-${index + 1}`}
                onPress={() => onToggle(index)}
                style={({ pressed }) => [
                  styles.barPart,
                  active && styles.barPartSelected,
                  pressed && { opacity: 0.72 },
                ]}
              />
            );
          })}
        </View>
      ) : (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={`${problem.denominator} objects in one group`}
          style={styles.setGrid}
        >
          {Array.from({ length: problem.denominator }, (_, index) => {
            const active = selectedSet.has(index);
            return (
              <Pressable
                key={index}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Object ${index + 1} of ${problem.denominator}${active ? ', selected' : ', not selected'}`}
                testID={`model-part-${index + 1}`}
                onPress={() => onToggle(index)}
                style={({ pressed }) => [
                  styles.setPiece,
                  active && styles.setPieceSelected,
                  pressed && { opacity: 0.72 },
                ]}
              >
                <Feather name="circle" size={17} color={active ? colors.secondaryForeground : colors.mutedForeground} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState<SavedProgress>(EMPTY_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [screen, setScreen] = useState<'home' | 'lesson'>('home');
  const [activeLessonId, setActiveLessonId] = useState(LESSONS[0].id);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [numeratorDraft, setNumeratorDraft] = useState('');
  const [denominatorDraft, setDenominatorDraft] = useState('');
  const [result, setResult] = useState<'idle' | 'correct' | 'incorrect' | 'save-error'>('idle');
  const [hintVisible, setHintVisible] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 14);

  const reload = useCallback(async () => {
    setLoading(true);
    setStorageError(null);
    try {
      const saved = await readProgress();
      setProgress(saved);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Progress could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const completedCount = progress.completedLessonIds.length;
  const totalAnswers = LESSONS.reduce(
    (sum, lesson) => sum + (progress.worksheetAnswers[lesson.id]?.length ?? 0),
    0,
  );
  const totalSteps = LESSONS.length * (WORKSHEET_SIZE + 1);
  const firstIncomplete = LESSONS.findIndex((lesson, index) => {
    const unlocked = index === 0 || progress.completedLessonIds.includes(LESSONS[index - 1].id);
    return unlocked && !progress.completedLessonIds.includes(lesson.id);
  });
  const activeLesson = LESSONS.find((lesson) => lesson.id === activeLessonId) ?? LESSONS[0];
  const isTransfer = step >= TRANSFER_STEP;
  const activeProblem = isTransfer
    ? activeLesson.transfer
    : activeLesson.questions[Math.min(step, WORKSHEET_SIZE - 1)];
  const answeredCount = progress.worksheetAnswers[activeLesson.id]?.length ?? 0;
  const isModelReady = selected.length === activeProblem.numerator;
  const canCheck =
    isModelReady &&
    numeratorDraft.trim() !== '' &&
    denominatorDraft.trim() !== '' &&
    result !== 'correct';

  const openLesson = (lesson: Lesson) => {
    const lessonIndex = LESSONS.findIndex((item) => item.id === lesson.id);
    const unlocked =
      lessonIndex === 0 || progress.completedLessonIds.includes(LESSONS[lessonIndex - 1].id);
    if (!unlocked) return;
    setActiveLessonId(lesson.id);
    setStep(progress.completedLessonIds.includes(lesson.id) ? 0 : (progress.worksheetAnswers[lesson.id]?.length ?? 0));
    setSelected([]);
    setNumeratorDraft('');
    setDenominatorDraft('');
    setResult('idle');
    setHintVisible(false);
    setScreen('lesson');
    void Haptics.selectionAsync();
  };

  const goHome = () => {
    setScreen('home');
    setResult('idle');
    setSelected([]);
    setNumeratorDraft('');
    setDenominatorDraft('');
  };

  const togglePiece = (index: number) => {
    setSelected((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
    if (result !== 'idle') setResult('idle');
  };

  const saveAnswer = async () => {
    if (!isModelReady) {
      setResult('incorrect');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (!sameFraction(numeratorDraft, denominatorDraft, activeProblem)) {
      setResult('incorrect');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const next: SavedProgress = {
      completedLessonIds: isTransfer
        ? Array.from(new Set([...progress.completedLessonIds, activeLesson.id]))
        : progress.completedLessonIds,
      worksheetAnswers: { ...progress.worksheetAnswers },
    };

    if (!isTransfer) {
      const answers = [...(progress.worksheetAnswers[activeLesson.id] ?? [])];
      answers[step] = `${Number(numeratorDraft)}/${Number(denominatorDraft)}`;
      next.worksheetAnswers[activeLesson.id] = answers.slice(0, WORKSHEET_SIZE);
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setProgress(next);
      setResult('correct');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setResult('save-error');
    }
  };

  const continueAfterCorrect = () => {
    if (isTransfer) {
      goHome();
      return;
    }
    setStep((current) => current + 1);
    setSelected([]);
    setNumeratorDraft('');
    setDenominatorDraft('');
    setResult('idle');
    setHintVisible(false);
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

  if (storageError) {
    return (
      <View style={[styles.screen, styles.errorScreen, { paddingTop: topInset + 20, paddingBottom: bottomInset + 20 }]}>
        <Feather name="alert-circle" size={35} color={colors.destructive} />
        <Text style={styles.errorTitle}>Your progress didn’t load</Text>
        <Text style={styles.errorCopy}>{storageError}</Text>
        <Pressable accessibilityRole="button" onPress={() => void reload()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (screen === 'home') {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 12, paddingBottom: bottomInset + 34 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={styles.brand}>
            <Image
              source={require('../assets/images/icon.png')}
              contentFit="cover"
              style={styles.brandIcon}
              accessibilityLabel="Fraction Quest icon"
            />
            <Text style={styles.brandName}>Fraction Quest</Text>
          </View>
          <View style={styles.profileBadge} accessibilityLabel="Your local learning profile">
            <Feather name="smile" size={20} color={colors.secondary} />
          </View>
        </View>

        <View>
          <Text style={styles.eyebrow}>A little practice, a lot of “aha!”</Text>
          <Text style={styles.heroTitle}>Your fraction adventure starts here.</Text>
          <Text style={[styles.body, styles.heroBody]}>
            Tap the model, enter your answer, and see fractions come to life.
          </Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View>
              <Text style={styles.progressTitle}>Your iPhone starter trail</Text>
              <Text style={styles.progressCopy}>
                {completedCount === LESSONS.length
                  ? 'Both starter lessons complete'
                  : `${completedCount} of ${LESSONS.length} lessons complete`}
              </Text>
            </View>
            <Text style={styles.progressCount}>{completedCount}/{LESSONS.length}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(completedCount / LESSONS.length) * 100}%` }]} />
          </View>
        </View>

        <View>
          <Text style={styles.sectionHeading}>Choose your next step</Text>
          <Text style={styles.sectionSubheading}>Each lesson has 10 practice questions and a final model check.</Text>
          <View style={styles.lessonList}>
            {LESSONS.map((lesson, index) => {
              const unlocked =
                index === 0 || progress.completedLessonIds.includes(LESSONS[index - 1].id);
              const complete = progress.completedLessonIds.includes(lesson.id);
              const savedAnswers = progress.worksheetAnswers[lesson.id]?.length ?? 0;
              return (
                <Pressable
                  key={lesson.id}
                  testID={`lesson-card-${lesson.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !unlocked }}
                  accessibilityLabel={`${lesson.title}, ${complete ? 'complete' : unlocked ? `${savedAnswers} of 10 answers` : 'locked'}`}
                  disabled={!unlocked}
                  onPress={() => openLesson(lesson)}
                  style={({ pressed }) => [
                    styles.lessonCard,
                    !unlocked && styles.lessonCardLocked,
                    pressed && styles.lessonCardPressed,
                  ]}
                >
                  <View style={styles.lessonCardTop}>
                    <View style={[styles.lessonIcon, lesson.tint === 'coral' ? styles.lessonIconCoral : styles.lessonIconTeal]}>
                      <Feather
                        name={lesson.model === 'bar' ? 'sidebar' : 'grid'}
                        size={21}
                        color={lesson.tint === 'coral' ? colors.primary : colors.secondary}
                      />
                    </View>
                    <View style={styles.lessonText}>
                      <Text style={styles.lessonUnit}>{`STEP ${index + 1} · ${lesson.unit}`}</Text>
                      <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    </View>
                    {complete ? (
                      <Feather name="check-circle" size={21} color={colors.success} />
                    ) : unlocked ? (
                      <Feather name="arrow-up-right" size={20} color={colors.mutedForeground} />
                    ) : (
                      <Feather name="lock" size={19} color={colors.mutedForeground} />
                    )}
                  </View>
                  <Text style={styles.lessonCopy}>{lesson.description}</Text>
                  <View style={styles.cardFooter}>
                    <View style={[styles.statusPill, complete && styles.statusComplete]}>
                      <Feather
                        name={complete ? 'check' : unlocked ? 'edit-3' : 'lock'}
                        size={13}
                        color={complete ? colors.success : colors.mutedForeground}
                      />
                      <Text style={[styles.statusText, complete && styles.statusCompleteText]}>
                        {complete ? 'Completed' : unlocked ? `${savedAnswers} / 10 answers` : 'Finish step 1 first'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.cardAction,
                        lesson.tint === 'teal' && unlocked && styles.cardActionTeal,
                        !unlocked && styles.cardActionDisabled,
                      ]}
                    >
                      <Text style={[styles.cardActionText, !unlocked && styles.cardActionDisabledText]}>
                        {complete ? 'Review' : unlocked ? savedAnswers > 0 ? 'Continue' : 'Start' : 'Locked'}
                      </Text>
                      <Feather
                        name={complete ? 'rotate-ccw' : unlocked ? 'arrow-right' : 'lock'}
                        size={15}
                        color={!unlocked ? colors.mutedForeground : colors.primaryForeground}
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.noteCard}>
          <Feather name="smartphone" size={18} color={colors.foreground} />
          <Text style={styles.noteText}>
            Your progress is saved on this device. Complete all 10 answers and the final model check to unlock the next lesson.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const worksheetProgress = Math.min(answeredCount, WORKSHEET_SIZE);
  const displayedStep = isTransfer ? WORKSHEET_SIZE + 1 : step + 1;
  const lessonNumber = LESSONS.findIndex((lesson) => lesson.id === activeLesson.id) + 1;
  const successMessage = isTransfer
    ? `${activeLesson.title} complete. The next lesson is now unlocked.`
    : 'That fraction matches your model. Nice work.';

  return (
    <KeyboardAwareScrollViewCompat
      style={styles.screen}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: topInset + 12, paddingBottom: bottomInset + 26 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bottomOffset={20}
    >
      <View style={styles.screenHeader}>
        <Pressable
          testID="lesson-back"
          accessibilityRole="button"
          accessibilityLabel="Back to lessons"
          onPress={goHome}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.lessonHeaderText}>
          <Text style={styles.stepLabel}>
            {isTransfer ? 'FINAL MODEL CHECK' : `LESSON ${lessonNumber} · ${worksheetProgress}/10`}
          </Text>
          <Text style={styles.lessonHeaderTitle}>{activeLesson.title}</Text>
        </View>
        <Text style={styles.modelCount}>{displayedStep}/11</Text>
      </View>

      <ProgressBar progress={(displayedStep / 11) * 100} />

      <View style={{ gap: 8 }}>
        <Text style={styles.prompt}>
          {isTransfer
            ? `Tap ${activeProblem.numerator} of ${activeProblem.denominator} equal ${activeLesson.model === 'bar' ? 'pieces' : 'objects'}. What fraction is selected?`
            : `Tap ${activeProblem.numerator} of ${activeProblem.denominator} equal ${activeLesson.model === 'bar' ? 'pieces' : 'objects'}. What fraction is selected?`}
        </Text>
        <Text style={styles.body}>
          {isModelReady
            ? isTransfer
              ? 'Now write the fraction that matches your model.'
              : 'Your model is ready. Write the fraction to continue.'
            : `Select ${activeProblem.numerator} equal ${activeLesson.model === 'bar' ? 'pieces' : 'objects'} in the model first.`}
        </Text>
      </View>

      <FractionModel
        lesson={activeLesson}
        problem={activeProblem}
        selected={selected}
        onToggle={togglePiece}
      />

      <View>
        <Text style={styles.inputLabel}>Enter the fraction you made</Text>
        <View style={styles.fractionInputs}>
          <TextInput
            testID="answer-numerator"
            accessibilityLabel="Fraction numerator"
            value={numeratorDraft}
            onChangeText={(value) => {
              setNumeratorDraft(value.replace(/[^0-9]/g, '').slice(0, 2));
              if (result !== 'idle') setResult('idle');
            }}
            keyboardType="number-pad"
            returnKeyType="next"
            maxLength={2}
            selectTextOnFocus
            style={styles.fractionInput}
            placeholder="?"
            placeholderTextColor={colors.mutedForeground}
          />
          <View style={styles.fractionSlash} />
          <TextInput
            testID="answer-denominator"
            accessibilityLabel="Fraction denominator"
            value={denominatorDraft}
            onChangeText={(value) => {
              setDenominatorDraft(value.replace(/[^0-9]/g, '').slice(0, 2));
              if (result !== 'idle') setResult('idle');
            }}
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={2}
            selectTextOnFocus
            style={styles.fractionInput}
            placeholder="?"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={result === 'correct' ? (isTransfer ? 'Finish lesson' : 'Continue to next question') : 'Check answer'}
        testID="answer-submit"
        disabled={result !== 'correct' && !canCheck}
        onPress={result === 'correct' ? continueAfterCorrect : () => void saveAnswer()}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
          result !== 'correct' && !canCheck && styles.primaryButtonDisabled,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {result === 'correct' ? (isTransfer ? 'Finish lesson' : 'Next question') : 'Check answer'}
        </Text>
        <Feather name={result === 'correct' && !isTransfer ? 'arrow-right' : 'check'} size={18} color={colors.primaryForeground} />
      </Pressable>

      {result === 'incorrect' && (
        <View style={styles.feedback} accessibilityLiveRegion="polite">
          <Feather name="info" size={18} color={colors.primary} />
          <Text style={styles.feedbackText}>
            {!isModelReady
              ? `Choose ${activeProblem.numerator} equal ${activeLesson.model === 'bar' ? 'pieces' : 'objects'} in the model, then try again.`
              : 'Not quite yet. The top number counts selected parts; the bottom counts all equal parts. Try again.'}
          </Text>
        </View>
      )}
      {result === 'save-error' && (
        <View style={styles.feedback} accessibilityLiveRegion="polite">
          <Feather name="alert-triangle" size={18} color={colors.destructive} />
          <Text style={styles.feedbackText}>Your answer couldn’t be saved on this device. Please check storage and try again.</Text>
        </View>
      )}
      {result === 'correct' && (
        <View style={[styles.feedback, styles.feedbackCorrect]} accessibilityLiveRegion="polite">
          <Feather name="check-circle" size={18} color={colors.success} />
          <Text style={styles.feedbackText}>{successMessage}</Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: hintVisible }}
        onPress={() => setHintVisible((visible) => !visible)}
        style={styles.helpRow}
      >
        <Feather name="help-circle" size={17} color={colors.secondary} />
        <Text style={styles.helpText}>
          {hintVisible
            ? 'The bottom number tells how many equal parts make one whole. The top number tells how many parts you selected.'
            : 'Need a hint?'}
        </Text>
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}
