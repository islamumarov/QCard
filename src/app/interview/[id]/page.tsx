"use client";

import { use } from "react";
import InterviewClient from "@/components/InterviewClient";

export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <InterviewClient sessionId={id} />;
}
