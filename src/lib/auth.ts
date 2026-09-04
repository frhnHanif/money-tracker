import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { username, password } = credentials as {
          username: string;
          password: string;
        };

        const ADMIN_USER = process.env.ADMIN_USER;
        const ADMIN_PASS = process.env.ADMIN_PASS;

        if (!ADMIN_USER || !ADMIN_PASS) {
          throw new Error("ADMIN_USER and ADMIN_PASS environment variables must be set.");
        }

        if (username === ADMIN_USER && password === ADMIN_PASS) {
          return { id: "1", name: "Hanif", email: "hanif@example.com" };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLoginPage = nextUrl.pathname.startsWith("/login");

      if (isOnLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      if (!isLoggedIn) return false; // Redirect to signIn page
      return true;
    },
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
});
