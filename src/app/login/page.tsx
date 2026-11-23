import { env } from "@/server/env";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return <LoginForm demo={env.allowDemoReset} />;
}
