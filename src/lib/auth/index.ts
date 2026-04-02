/**
 * NextAuth.js 配置
 * 使用 Credentials Provider + Google OAuth + 数据库用户表
 */

import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name?: string | null;
    picture?: string | null;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const result = await query(
          'SELECT id, email, password_hash FROM users WHERE email = $1',
          [credentials.email]
        );

        const user = result.rows[0];
        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      if (account?.provider === 'google' && account.access_token) {
        const result = await query(
          'SELECT id FROM users WHERE email = $1',
          [token.email]
        );
        if (result.rows.length === 0) {
          const newUser = await query(
            'INSERT INTO users (email, name, password_hash, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
            [token.email, token.name, 'GOOGLE_OAUTH']
          );
          token.id = newUser.rows[0].id;
        } else {
          token.id = result.rows[0].id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        name: token.name,
        image: token.picture,
      };
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};
