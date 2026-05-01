import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PhoneOff, ScreenShare, MicOff } from 'lucide-react-native';
import { nightPalette as nt } from '../../theme/palettes';
import { typography, tabularNums } from '../../theme/typography';
import { ChevronLeft, IconMic, IconVideo, IconChat } from '../../icons';
import { useApiQuery } from '../../api/query';
import { appointmentService } from '../../api/services';
import { queryKeys } from '../../api/queryKeys';

function useBlink() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 500 }), withTiming(1, { duration: 500 })),
      -1,
      false,
    );
    // opacity is a Reanimated shared value — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

function formatTimer(s: number) {
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

export function JoinVideoVisitScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const apptId = (Array.isArray(appointmentId) ? appointmentId[0] : appointmentId) ?? '';
  const [elapsed, setElapsed] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const blinkStyle = useBlink();

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const loadAppointments = useCallback(() => appointmentService.list(), []);
  const appointments = useApiQuery(queryKeys.appointment(apptId), loadAppointments, { enabled: Boolean(apptId) });
  const appointment = appointments.data?.find((a) => a.id === apptId) ?? null;
  const doctorName = appointment?.doctor_name ?? 'Doctor';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: '#0A0D13' }]} edges={['top', 'bottom']}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={22} color={nt.ink} />
        </Pressable>
        <Text style={[typography.bodyMed, { color: nt.ink }]}>Video visit</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Self-preview — top-right */}
      <LinearGradient
        colors={['#1a2130', '#0B0F14']}
        style={s.selfPreview}
      >
        <Text style={[typography.micro, { color: nt.ink3 }]}>You</Text>
      </LinearGradient>

      {/* Doctor avatar + info */}
      <View style={s.center}>
        <View style={s.glow} />
        <LinearGradient colors={['#5BA8C8', '#1965B3']} style={s.avatar}>
          <Text style={s.avatarInitial}>{doctorName.slice(0, 1).toUpperCase()}</Text>
        </LinearGradient>
        <Text style={[typography.title, { color: nt.ink, marginTop: 16 }]}>{doctorName}</Text>
        <Text style={[typography.caption, { color: nt.ink3, marginBottom: 12 }]}>
          {appointment?.specialty ?? 'Specialist'}
        </Text>

        {/* LIVE timer */}
        <View style={s.timerRow}>
          <Animated.View style={[s.liveDot, blinkStyle]} />
          <Text style={[typography.bodyMed, tabularNums, { color: nt.ink }]}>{formatTimer(elapsed)}</Text>
        </View>
      </View>

      {/* Control buttons */}
      <View style={s.controls}>
        <CtrlBtn
          icon={micOn ? <IconMic size={24} color="#fff" /> : <MicOff size={24} color={nt.ink3} />}
          onPress={() => setMicOn((v) => !v)}
        />
        <CtrlBtn
          icon={camOn ? <IconVideo size={24} color="#fff" /> : <IconVideo size={24} color={nt.ink3} />}
          onPress={() => setCamOn((v) => !v)}
        />
        <CtrlBtn icon={<ScreenShare size={24} color="#fff" />} onPress={() => {}} />
        <CtrlBtn icon={<IconChat size={24} color="#fff" />} onPress={() => router.push('/(tabs)/chat' as never)} />
        <CtrlBtn icon={<PhoneOff size={24} color="#fff" />} onPress={() => router.back()} danger />
      </View>
    </SafeAreaView>
  );
}

function CtrlBtn({ icon, onPress, danger }: { icon: React.ReactNode; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.ctrlBtn,
        { backgroundColor: danger ? '#E54D4D' : 'rgba(255,255,255,0.14)', opacity: pressed ? 0.75 : 1 },
      ]}
    >
      {icon}
    </Pressable>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  topBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn:       { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  selfPreview:   { position: 'absolute', top: 80, right: 16, width: 96, height: 128, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8, zIndex: 10 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glow:          { position: 'absolute', width: 220, height: 160, borderRadius: 110, backgroundColor: 'rgba(91,168,200,0.12)' },
  avatar:        { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 44, lineHeight: 52, fontFamily: 'Inter_800ExtraBold', color: '#fff' },
  timerRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E54D4D' },
  controls:      { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingHorizontal: 24, paddingBottom: 20 },
  ctrlBtn:       { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
