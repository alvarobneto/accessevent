import { router } from 'expo-router';
import { View, Pressable } from 'react-native';
import { useState } from 'react';

import { Screen } from '@/components/screen';
import { Text, Icon, Button, Input, Alert } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { api, ApiError } from '@/services/apiClient';
import {
  birthDateToISO,
  formatBirthDateInput,
  isValidBirthDate,
  isValidEmail,
} from '@/utils/validation';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function handleSignup() {
    setError('');

    if (!isValidEmail(email)) {
      setError('Informe um e-mail válido.');
      return;
    }
    if (!firstName.trim()) {
      setError('Informe o primeiro nome.');
      return;
    }
    if (!lastName.trim()) {
      setError('Informe o sobrenome.');
      return;
    }
    if (!birthDate.trim()) {
      setError('Informe a data de nascimento.');
      return;
    }
    if (!isValidBirthDate(birthDate)) {
      setError('Informe uma data de nascimento válida (dd-mm-aaaa).');
      return;
    }
    if (!password.trim()) {
      setError('Informe uma senha.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    const formattedBirthDate = birthDateToISO(birthDate);
    if (!formattedBirthDate) {
      setError('Data de nascimento inválida.');
      return;
    }

    setIsLoading(true);

    api
      .post<{ id: string; email: string }>('/users/signup', {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: formattedBirthDate,
        password,
      })
      .then(() => {
        router.replace({
          pathname: '/login',
          params: { registered: 'true', email: email.trim() },
        });
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Erro ao cadastrar usuário. Tente novamente.');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  return (
    <Screen scrollable contentClassName="gap-8 px-6 pb-8 pt-6">
      <View>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/splash'))}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100"
        >
          <Text variant="heading">‹</Text>
        </Pressable>
        <View className="mt-8 h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <Icon name="user-plus" size={20} color={colors.white} />
        </View>
        <Text variant="caption" className="mt-6">
          Crie sua conta
        </Text>
        <Text variant="display" className="mt-2">
          Preencha seus dados para continuar.
        </Text>
      </View>

      <View className="gap-4">
        {error ? <Alert tone="error" title="Erro no cadastro" description={error} /> : null}

        <Input
          label="E-mail"
          placeholder="seu@email.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input
          label="Primeiro nome"
          placeholder="João"
          value={firstName}
          onChangeText={setFirstName}
        />
        <Input label="Sobrenome" placeholder="Silva" value={lastName} onChangeText={setLastName} />
        <Input
          label="Data de nascimento"
          placeholder="dd-mm-aaaa"
          value={birthDate}
          onChangeText={(text) => setBirthDate(formatBirthDateInput(text))}
          keyboardType="numeric"
          maxLength={10}
        />
        <Input
          label="Senha"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button
          label={isLoading ? 'Cadastrando...' : 'Cadastrar'}
          loading={isLoading}
          disabled={isLoading}
          iconStart={<Icon name="signup" size={20} color={colors.white} />}
          onPress={handleSignup}
          fullWidth
        />
      </View>

      <View className="flex-row items-center justify-center gap-1 pt-2">
        <Text variant="caption" tint="muted">
          Já tem uma conta?
        </Text>
        <Pressable onPress={() => router.replace('/login')} accessibilityLabel="Login" hitSlop={8}>
          <Text variant="caption" tint="primary" className="font-semibold">
            Entrar
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
