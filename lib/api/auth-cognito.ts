import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { signUp, confirmSignUp, signOut, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { LoginRequest, LoginResponse } from '@/types';
import outputs from '../../amplify_outputs.json';

const client = new CognitoIdentityProviderClient({
  region: outputs.auth.aws_region,
});

export class CognitoAuthService {
  async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      // Use AWS SDK for server-side authentication
      const response = await client.send(
        new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: outputs.auth.user_pool_client_id,
          AuthParameters: {
            USERNAME: request.email,
            PASSWORD: request.password,
          },
        })
      );

      if (!response.AuthenticationResult) {
        throw new Error('Authentication failed');
      }

      const { IdToken, AccessToken, RefreshToken } = response.AuthenticationResult;

      // Decode the ID token to get user attributes
      const idTokenPayload = JSON.parse(
        Buffer.from(IdToken!.split('.')[1], 'base64').toString()
      );

      const user = {
        userId: idTokenPayload.sub,
        email: idTokenPayload.email || request.email,
        firstName: idTokenPayload.given_name || '',
        lastName: idTokenPayload.family_name || '',
        role: idTokenPayload['custom:role'] || 'ORGANIZER',
        status: 'ACTIVE' as any,
        phone: idTokenPayload.phone_number,
        companyName: idTokenPayload['custom:companyName'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        user,
        token: AccessToken!,
        refreshToken: RefreshToken!,
      };
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  }

  async register(email: string, password: string, firstName: string, lastName: string, role: string = 'ORGANIZER') {
    try {
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            given_name: firstName,
            family_name: lastName,
            'custom:role': role,
          },
        },
      });

      return {
        userId,
        isComplete: isSignUpComplete,
        nextStep: nextStep.signUpStep,
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  }

  async confirmSignUp(email: string, code: string) {
    try {
      const { isSignUpComplete, nextStep } = await confirmSignUp({
        username: email,
        confirmationCode: code,
      });

      return {
        isComplete: isSignUpComplete,
        nextStep: nextStep.signUpStep,
      };
    } catch (error: any) {
      console.error('Confirmation error:', error);
      throw new Error(error.message || 'Confirmation failed');
    }
  }

  async logout() {
    try {
      await signOut();
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error(error.message || 'Logout failed');
    }
  }

  async resetPassword(email: string) {
    try {
      const output = await resetPassword({ username: email });
      return {
        nextStep: output.nextStep.resetPasswordStep,
      };
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.message || 'Password reset failed');
    }
  }

  async confirmResetPassword(email: string, code: string, newPassword: string) {
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      });
    } catch (error: any) {
      console.error('Confirm reset password error:', error);
      throw new Error(error.message || 'Password reset confirmation failed');
    }
  }
}

export const cognitoAuthService = new CognitoAuthService();
