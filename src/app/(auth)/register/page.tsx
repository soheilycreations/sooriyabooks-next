import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create Account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-6 font-heading text-2xl">Create Account</h1>
      <RegisterForm />
    </>
  );
}
