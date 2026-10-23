import fs from "node:fs";
import path from "node:path";

async function testHttpEndpoints() {
  console.log("=== TESTING LIVE HTTP ENDPOINTS AT http://localhost:3000 ===");

  // 1. Unauthenticated Admin Check
  console.log("[1] Testing unauthenticated access to /api/admin/mentor-applications...");
  const unauthRes = await fetch("http://localhost:3000/api/admin/mentor-applications");
  console.log(`    Status: ${unauthRes.status} (Expected: 403)`);
  if (unauthRes.status !== 403) {
    throw new Error(`Expected 403, got ${unauthRes.status}`);
  }

  // 2. Admin Login
  console.log("[2] Logging in as admin (admin@jeecompass.com)...");
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@jeecompass.com",
      password: "%R6jdv^qbq!3t46b",
    }),
  });

  console.log(`    Login Status: ${loginRes.status}`);
  const loginData = await loginRes.json();
  console.log("    User:", loginData.user);
  if (!loginRes.ok || loginData.user?.role !== "admin") {
    throw new Error(`Admin login failed: ${JSON.stringify(loginData)}`);
  }

  // Extract session cookie
  const cookieHeader = loginRes.headers.get("set-cookie");
  if (!cookieHeader) {
    throw new Error("No session cookie returned from login!");
  }
  const sessionCookie = cookieHeader.split(";")[0];
  console.log("    Acquired Session Cookie:", sessionCookie.substring(0, 25) + "...");

  // 3. Authenticated Admin Call to /api/admin/mentor-applications
  console.log("[3] Accessing /api/admin/mentor-applications with Admin Cookie...");
  const adminAppsRes = await fetch("http://localhost:3000/api/admin/mentor-applications", {
    headers: { Cookie: sessionCookie },
  });
  console.log(`    Status: ${adminAppsRes.status}`);
  const adminAppsData = await adminAppsRes.json();
  console.log("    Counts:", adminAppsData.counts);
  console.log("    Applications Count:", adminAppsData.applications?.length);
  if (!adminAppsRes.ok) {
    throw new Error(`Admin apps call failed: ${JSON.stringify(adminAppsData)}`);
  }

  // 4. Register a new mentor via multipart/form-data
  console.log("[4] Submitting Mentor Registration via /api/mentor/register...");
  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
  const dummyResumePdf = "%PDF-1.4\n%Live HTTP automated test CV\n%%EOF";
  
  const testCandidateEmail = `mentor.candidate.${Date.now()}@example.com`;
  const formData = new FormData();
  formData.append("fullName", "Prof. Ananya Sen");
  formData.append("email", testCandidateEmail);
  formData.append("phone", "+91 9988776655");
  formData.append("highestQualification", "M.Tech in Mathematics");
  formData.append("institute", "IIT Delhi");
  formData.append("currentProfession", "Senior JEE Mathematics Mentor");
  formData.append("experienceYears", "6");
  formData.append("subjects", "Calculus, Algebra, Coordinate Geometry");
  formData.append("bio", "Mathematics educator with 6 years experience mentoring JEE aspirants.");
  formData.append("teachingExperience", "Coached 1500+ students, many secured AIR under 1000 in JEE Advanced.");
  formData.append("preferredMode", "Online");
  formData.append("linkedInUrl", "https://linkedin.com/in/ananya-sen");
  formData.append("targetExams", "JEE Main & JEE Advanced");
  formData.append("availabilityHours", "12");
  
  const resumeBlob = new Blob([dummyResumePdf], { type: "application/pdf" });
  formData.append("resume", resumeBlob, "Ananya_Sen_Resume.pdf");

  const registerRes = await fetch("http://localhost:3000/api/mentor/register", {
    method: "POST",
    body: formData,
  });

  console.log(`    Register Status: ${registerRes.status}`);
  const registerData = await registerRes.json();
  console.log("    Result:", registerData);
  if (!registerRes.ok || !registerData.applicationId) {
    throw new Error(`Mentor registration failed: ${JSON.stringify(registerData)}`);
  }
  const createdAppId = registerData.applicationId;

  // 5. Check Application Status as Candidate via /api/mentor/application-status
  console.log(`[5] Candidate checking application status for ${createdAppId}...`);
  const statusRes = await fetch(`http://localhost:3000/api/mentor/application-status?applicationId=${createdAppId}`);
  console.log(`    Status check HTTP: ${statusRes.status}`);
  const statusData = await statusRes.json();
  console.log(`    Candidate sees status: ${statusData.application?.status}, name: ${statusData.application?.fullName}`);
  if (statusData.application?.status !== "Pending") {
    throw new Error(`Expected Pending status, got ${statusData.application?.status}`);
  }

  // 6. Admin updates application to "Under Review" and adds internal note
  console.log(`[6] Admin updating application ${registerData.id} to 'Under Review'...`);
  const reviewRes = await fetch(`http://localhost:3000/api/admin/mentor-applications/${registerData.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      status: "Under Review",
      adminNotes: "Credentials from IIT Delhi verified. Proceed to schedule interview.",
    }),
  });
  console.log(`    Review update HTTP: ${reviewRes.status}`);
  const reviewData = await reviewRes.json();
  console.log(`    New status: ${reviewData.application?.status}, Notes: ${reviewData.application?.adminNotes}`);
  if (reviewData.application?.status !== "Under Review") {
    throw new Error("Failed to transition to Under Review");
  }

  // 7. Admin schedules interview
  console.log(`[7] Admin scheduling interview for ${registerData.id}...`);
  const interviewRes = await fetch(`http://localhost:3000/api/admin/mentor-applications/${registerData.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      status: "Interview Scheduled",
      interviewDate: "2026-10-26",
      interviewTime: "02:00 PM IST",
      meetingMode: "Google Meet",
      meetingLink: "https://meet.google.com/xyz-live-test",
      notifyCandidate: false, // test mode
    }),
  });
  console.log(`    Interview schedule HTTP: ${interviewRes.status}`);
  const interviewData = await interviewRes.json();
  console.log(`    Interview scheduled:`, interviewData.application?.interview);
  if (interviewData.application?.status !== "Interview Scheduled") {
    throw new Error("Failed to transition to Interview Scheduled");
  }

  // 8. Candidate checks status again to see scheduled interview
  console.log(`[8] Candidate checking updated status...`);
  const statusRes2 = await fetch(`http://localhost:3000/api/mentor/application-status?applicationId=${createdAppId}`);
  const statusData2 = await statusRes2.json();
  console.log(`    Candidate sees: Status=${statusData2.application?.status}, Interview Date=${statusData2.application?.interview?.date}, Time=${statusData2.application?.interview?.time}`);
  if (statusData2.application?.status !== "Interview Scheduled") {
    throw new Error("Candidate did not see Interview Scheduled status");
  }

  // 9. Admin views / downloads resume securely
  console.log(`[9] Admin fetching candidate resume PDF via /api/admin/mentor-applications/${registerData.id}/resume...`);
  const resumeRes = await fetch(`http://localhost:3000/api/admin/mentor-applications/${registerData.id}/resume`, {
    headers: { Cookie: sessionCookie },
  });
  console.log(`    Resume HTTP: ${resumeRes.status}, Content-Type: ${resumeRes.headers.get("content-type")}`);
  if (resumeRes.status !== 200 || !resumeRes.headers.get("content-type")?.includes("pdf")) {
    throw new Error("Failed to securely stream resume");
  }

  // 10. Non-admin attempting to access resume must be blocked (403)
  console.log(`[10] Unauthenticated request to resume must fail...`);
  const unauthResumeRes = await fetch(`http://localhost:3000/api/admin/mentor-applications/${registerData.id}/resume`);
  console.log(`    Unauthenticated Resume Status: ${unauthResumeRes.status} (Expected: 403)`);
  if (unauthResumeRes.status !== 403) {
    throw new Error(`Expected 403 for unauthorized resume access, got ${unauthResumeRes.status}`);
  }

  // 11. Admin accepts mentor
  console.log(`[11] Admin accepting candidate...`);
  const acceptRes = await fetch(`http://localhost:3000/api/admin/mentor-applications/${registerData.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
    },
    body: JSON.stringify({
      status: "Accepted",
    }),
  });
  console.log(`    Accept HTTP: ${acceptRes.status}`);
  const acceptData = await acceptRes.json();
  console.log(`    Final status: ${acceptData.application?.status}`);
  if (acceptData.application?.status !== "Accepted") {
    throw new Error("Failed to accept mentor");
  }

  console.log("=== ALL LIVE HTTP INTEGRATION TESTS PASSED WITH 100% SUCCESS! ===");
}

testHttpEndpoints().catch((err) => {
  console.error("HTTP test failed:", err);
  process.exit(1);
});

