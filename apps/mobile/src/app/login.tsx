import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/presentation/state/useAuthStore';
import { colors } from '@/presentation/theme/colors';
import { spacing, radii } from '@/presentation/theme/spacing';

// Credenciais do motorista de demonstração (mesmas que o BFF usa por padrão e o Keycloak importa)
const DEMO_EMAIL = 'motorista@volthub.com';
const DEMO_PASSWORD = 'motorista123';

export default function LoginScreen() {
  const { login, loading, error } = useAuthStore();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;
  const submit = () => {
    if (canSubmit) login(email.trim(), password);
  };

  return (
    <KeyboardAvoidingView
      testID="login-screen"
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.logoCircle}>
        <Ionicons name="flash" size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>VoltHub</Text>
      <Text style={styles.subtitle}>Entre para encontrar e reservar eletropostos</Text>

      <View style={styles.form}>
        <Text style={styles.label}>E-mail</Text>
        <TextInput
          testID="login-email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="voce@email.com"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          testID="login-password"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Sua senha"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={submit}
        />

        {error ? (
          <Text testID="login-error" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Pressable
          testID="login-submit"
          onPress={submit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.button,
            !canSubmit && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.hint}>
        Sem conexão com o servidor, o app entra em modo offline com os dados de demonstração.
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoCircle: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  button: {
    height: 50,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '800',
  },
  hint: {
    marginTop: spacing.xl,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
