import type { Metadata } from "next";
import ProfileContent from "./ProfileContent";

export const metadata: Metadata = {
  title: "Profilo | disciplinaFIT",
  description: "Il tuo profilo su disciplinaFIT.",
};

export default function ProfilePage() {
  return <ProfileContent />;
}
