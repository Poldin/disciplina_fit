"use client";

import { useAuth } from "./AuthProvider";
import NameDialog from "./NameDialog";

export default function ProfileNameGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, userName, refreshProfile } = useAuth();

  const showNameDialog = Boolean(!loading && user && !userName);

  return (
    <>
      {children}
      <NameDialog isOpen={showNameDialog} onSuccess={refreshProfile} />
    </>
  );
}
