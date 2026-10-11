import { router, useLocalSearchParams } from 'expo-router';
import { View, Pressable } from 'react-native';
import { useState, useEffect } from 'react';

import { getStoredToken, saveSession, type AuthUser } from '@/services/authStorage';
import { api, ApiError } from '@/services/apiClient';
import { Screen } from '@/components/screen';
import { Text, Icon, Button, Input, Alert } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { isValidEmail } from '@/utils/validation';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ registered?: string; email?: string }>();
  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<'' | string>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadStoredToken() {
      try {
        const token = await getStoredToken();
        if (token && mounted) {
          router.replace('/user');
        }
      } catch {
        // Ignore errors reading storage
      }
    }

    loadStoredToken();

    return () => {
      mounted = false;
    };
  }, []);

  function handleLogin() {
    setError('');

    if (!isValidEmail(email)) {
      setError('Informe um e-mail válido.');
      return;
    }
    if (!password.trim()) {
      setError('Informe a senha.');
      return;
    }

    setIsLoading(true);

    api
      .post<{ accessToken: string; user?: AuthUser }>('/users/login', {
        email: email.trim(),
        password,
      })
      .then(async (data: { accessToken: string; user?: AuthUser }) => {
        if (data.accessToken) {
          const userObj = data.user || {
            email: email.trim(),
            firstName: email.split('@')[0],
          };
          await saveSession(data.accessToken, userObj);
          router.replace('/user');
        }
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('E-mail ou senha inválidos.');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  return (
    <Screen scrollable contentClassName="gap-8 px-6 pb-8 pt-6">
      <View>
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <Icon name="wheelchair-accessibility" size={20} color={colors.white} />
        </View>
        <Text variant="caption" className="mt-6">
          Bem-vinda de volta
        </Text>
        <Text variant="display" className="mt-2">
          Entre para continuar.
        </Text>
      </View>

      <View className="gap-4">
        {params.registered === 'true' && !error ? (
          <Alert
            tone="success"
            title="Conta criada com sucesso!"
            description="Sua conta foi cadastrada. Faça o login para continuar."
          />
        ) : null}

        {error ? <Alert tone="error" title="Falha ao entrar" description={error} /> : null}

        <Input
          label="E-mail"
          placeholder="seu@email.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError('');
          }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input
          label="Senha"
          placeholder="••••••••"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (error) setError('');
          }}
          secureTextEntry
        />
        <Button
          label={isLoading ? 'Entrando...' : 'Entrar'}
          loading={isLoading}
          disabled={isLoading}
          iconStart={<Icon name="login" size={20} color={colors.white} />}
          onPress={handleLogin}
          fullWidth
        />
      </View>

      <Text variant="caption" tint="muted" centered className="mt-auto">
        Ao continuar, você concorda com nossos termos de uso.
      </Text>

      <View className="flex-row items-center justify-center gap-1 pt-2">
        <Text variant="caption" tint="muted">
          Ainda não tem uma conta?
        </Text>
        <Pressable
          onPress={() => router.push('/signup')}
          accessibilityLabel="Criar conta"
          hitSlop={8}
        >
          <Text variant="caption" tint="primary" className="font-semibold">
            Criar conta
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
