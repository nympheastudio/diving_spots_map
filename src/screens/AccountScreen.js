/**
 * AccountScreen – profil utilisateur avec édition locale
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenHeader from '../components/ScreenHeader';
import SettingsRow  from '../components/SettingsRow';
import { useTheme } from '../context/ThemeContext';
import { radius } from '../theme';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const AccountScreen = ({ onBack }) => {
  const { colors, difficultyMeta } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name,    setName]    = useState('Plongeur Explorateur');
  const [email,   setEmail]   = useState('plongeur@diveexplorer.app');
  const [level,   setLevel]   = useState('Intermediate');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [n, e, l] = await Promise.all([
          AsyncStorage.getItem('@dive_v2_profile_name'),
          AsyncStorage.getItem('@dive_v2_profile_email'),
          AsyncStorage.getItem('@dive_v2_profile_level'),
        ]);
        if (n) setName(n);
        if (e) setEmail(e);
        if (l) setLevel(l);
      } catch {}
    })();
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem('@dive_v2_profile_name',  name),
        AsyncStorage.setItem('@dive_v2_profile_email', email),
        AsyncStorage.setItem('@dive_v2_profile_level', level),
      ]);
      setEditing(false);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil.');
    }
  }, [name, email, level]);

  const handleReset = () => Alert.alert(
    'Réinitialiser',
    'Toutes les données locales seront supprimées.',
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove([
            '@dive_v2_profile_name',
            '@dive_v2_profile_email',
            '@dive_v2_profile_level',
          ]).catch(() => {});
          setName('Plongeur Explorateur');
          setEmail('plongeur@diveexplorer.app');
          setLevel('Intermediate');
          setEditing(false);
        },
      },
    ]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader
        title="Mon Compte"
        onBack={onBack}
        rightAction={editing
          ? { icon: '✓', onPress: handleSave }
          : { icon: '✎', onPress: () => setEditing(true) }
        }
      />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Avatar ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={colors.gradProfile}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarIcon}>🤿</Text>
            </LinearGradient>
            <View style={styles.onlineDot} />
          </View>
          {editing && (
            <TouchableOpacity style={styles.changePhotoBtn} activeOpacity={0.75}>
              <Text style={styles.changePhotoText}>Changer la photo</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.memberSince}>Membre depuis Mars 2024</Text>
        </View>

        {/* ── Infos profil ── */}
        <Text style={styles.sectionLabel}>Profil</Text>
        <View style={styles.card}>
          <FieldRow label="Nom"   value={name}  editing={editing} onChangeText={setName} />
          <FieldRow
            label="Email" value={email} editing={editing} onChangeText={setEmail}
            keyboardType="email-address" isLast
          />
        </View>

        {/* ── Niveau ── */}
        <Text style={styles.sectionLabel}>Niveau de plongée</Text>
        <View style={styles.levelRow}>
          {LEVELS.map((l) => {
            const meta   = difficultyMeta[l];
            const active = level === l;
            return (
              <TouchableOpacity
                key={l}
                style={[styles.levelChip, active && { backgroundColor: meta.bg, borderColor: meta.color }]}
                onPress={() => editing && setLevel(l)}
                activeOpacity={editing ? 0.75 : 1}
              >
                <View style={[styles.levelDot, { backgroundColor: active ? meta.color : colors.textMuted }]} />
                <Text style={[styles.levelLabel, active && { color: meta.color, fontWeight: '700' }]}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Stats ── */}
        <Text style={styles.sectionLabel}>Statistiques</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="◎" iconColor={colors.primary}
            label="Spots visités" subtitle="Depuis l'inscription"
            rightSlot={<Text style={[styles.statVal, { color: colors.primary }]}>12</Text>}
          />
          <SettingsRow
            icon="★" iconColor={colors.amber}
            label="Spots favoris" subtitle="Enregistrés"
            rightSlot={<Text style={[styles.statVal, { color: colors.amber }]}>3</Text>}
          />
          <SettingsRow
            icon="↕" iconColor={colors.emerald}
            label="Profondeur max" subtitle="Record personnel"
            rightSlot={<Text style={[styles.statVal, { color: colors.emerald }]}>42m</Text>}
            showBorder={false}
          />
        </View>

        {/* ── Certifications ── */}
        <Text style={styles.sectionLabel}>Certifications</Text>
        <View style={styles.certRow}>
          {['PADI OWD', 'AOWD', 'EFR'].map((cert) => (
            <View key={cert} style={styles.certChip}>
              <Text style={styles.certText}>{cert}</Text>
            </View>
          ))}
        </View>

        {/* ── Danger ── */}
        <Text style={styles.sectionLabel}>Zone de danger</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="↩"
            label="Réinitialiser les données"
            subtitle="Supprime l'historique local"
            onPress={handleReset}
            danger
            showBorder={false}
          />
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const FieldRow = ({ label, value, editing, onChangeText, keyboardType, isLast }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.fieldRow, isLast && styles.fieldRowLast]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {editing ? (
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || 'default'}
          autoCapitalize="none"
          selectionColor={colors.primary}
          placeholderTextColor={colors.textMuted}
        />
      ) : (
        <Text style={styles.fieldValue} numberOfLines={1}>{value}</Text>
      )}
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  body:         { paddingBottom: 40 },

  avatarSection: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  avatarWrap:    { position: 'relative' },
  avatar: {
    width: 92, height: 92, borderRadius: 46,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.50, shadowRadius: 18, elevation: 14,
  },
  avatarIcon:   { fontSize: 40 },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.emerald, borderWidth: 2, borderColor: colors.bg,
  },
  changePhotoBtn: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: radius.pill, borderWidth: 1,
    borderColor: colors.primaryMid, backgroundColor: colors.primaryDim,
  },
  changePhotoText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  memberSince:     { fontSize: 12, color: colors.textMuted, letterSpacing: 0.2 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 1.1, textTransform: 'uppercase',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },

  card: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },

  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgCard, gap: 12,
  },
  fieldRowLast: { borderBottomWidth: 0 },
  fieldLabel: { fontSize: 15, color: colors.textSecondary, fontWeight: '500', width: 56 },
  fieldValue: { flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: '600', textAlign: 'right' },
  fieldInput: {
    flex: 1, fontSize: 15, color: colors.primary, fontWeight: '600',
    textAlign: 'right', paddingVertical: 2,
  },

  levelRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, flexWrap: 'wrap' },
  levelChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.pill, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgCard,
  },
  levelDot:  { width: 6, height: 6, borderRadius: 3 },
  levelLabel: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },

  certRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, flexWrap: 'wrap' },
  certChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill, borderWidth: 1,
    borderColor: colors.secondaryMid, backgroundColor: colors.secondaryDim,
  },
  certText: { fontSize: 12, fontWeight: '700', color: colors.secondary },

  statVal: { fontSize: 17, fontWeight: '800' },
});

export default AccountScreen;
