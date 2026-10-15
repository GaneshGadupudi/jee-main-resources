export function hasCompletedOnboarding(user) {
  const profile = user?.user_metadata?.student_profile;
  return Boolean(profile?.targetExam && profile?.examDate && profile?.prepStage && profile?.dailyHours && user?.user_metadata?.exams?.length);
}
