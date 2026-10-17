-- Timed tests: weekly contests and mock tests.
--   replaces localStorage: jee-contest-active, jee-contest-history, jee-mock-active, jee-mock-history, jee-challenge, jee-time

-- One row per attempt. Status = 'InProgress' while the timer is running (this is what lets a student resume on another device),
-- and becomes 'Submitted' with the final scores. Time spent studying is the sum of TimeTakenMs over submitted attempts.
IF OBJECT_ID(N'dbo.TestAttempts', N'U') IS NULL
CREATE TABLE dbo.TestAttempts (
  Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TestAttempts PRIMARY KEY,
  UserId INT NOT NULL CONSTRAINT FK_TestAttempts_User REFERENCES dbo.Users(Id) ON DELETE CASCADE,
  TestType VARCHAR(10) NOT NULL CONSTRAINT CK_TestAttempts_Type CHECK (TestType IN ('contest','mock')),
  TestKey NVARCHAR(100) NOT NULL,                -- contest id ('weekly-2026-10-17') or mock id ('mock-1')
  Title NVARCHAR(200) NOT NULL,
  IsVirtual BIT NOT NULL CONSTRAINT DF_TestAttempts_IsVirtual DEFAULT 0,
  Status VARCHAR(10) NOT NULL CONSTRAINT DF_TestAttempts_Status DEFAULT 'InProgress'
    CONSTRAINT CK_TestAttempts_Status CHECK (Status IN ('InProgress','Submitted')),
  StartedAt DATETIME2(3) NOT NULL,
  EndsAt DATETIME2(3) NOT NULL,
  SubmittedAt DATETIME2(3) NULL,
  SubmittedOn DATE NULL,                         -- student's local day (used for streaks and weekly minutes)
  CurrentIndex SMALLINT NOT NULL CONSTRAINT DF_TestAttempts_CurrentIndex DEFAULT 0,
  TimeTakenMs BIGINT NULL,
  TotalQuestions SMALLINT NOT NULL,
  Correct SMALLINT NULL,
  Wrong SMALLINT NULL,
  Skipped SMALLINT NULL,
  Score SMALLINT NULL,
  Accuracy TINYINT NULL
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TestAttempts_UserHistory')
CREATE INDEX IX_TestAttempts_UserHistory ON dbo.TestAttempts (UserId, TestType, Status, SubmittedAt DESC);
-- A student can only have one running attempt per test type.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_TestAttempts_OneRunning')
CREATE UNIQUE INDEX UX_TestAttempts_OneRunning ON dbo.TestAttempts (UserId, TestType) WHERE Status = 'InProgress';

-- One row per question of the attempt. Test questions are generated in code, so the position identifies the question.
-- While InProgress only touched questions have a row; on submit every question gets one.
IF OBJECT_ID(N'dbo.TestAttemptAnswers', N'U') IS NULL
CREATE TABLE dbo.TestAttemptAnswers (
  Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TestAttemptAnswers PRIMARY KEY,
  AttemptId INT NOT NULL CONSTRAINT FK_TestAttemptAnswers_Attempt REFERENCES dbo.TestAttempts(Id) ON DELETE CASCADE,
  QuestionIndex SMALLINT NOT NULL,
  SelectedOption TINYINT NULL,                   -- NULL = not answered
  IsMarked BIT NOT NULL CONSTRAINT DF_TestAttemptAnswers_IsMarked DEFAULT 0,
  TimeSpentMs INT NOT NULL CONSTRAINT DF_TestAttemptAnswers_Time DEFAULT 0,
  CONSTRAINT UQ_TestAttemptAnswers UNIQUE (AttemptId, QuestionIndex)
);

-- Weekly-challenge registration, per contest.
IF OBJECT_ID(N'dbo.ContestRegistrations', N'U') IS NULL
CREATE TABLE dbo.ContestRegistrations (
  UserId INT NOT NULL CONSTRAINT FK_ContestRegistrations_User REFERENCES dbo.Users(Id) ON DELETE CASCADE,
  ContestKey NVARCHAR(100) NOT NULL,
  RegisteredAt DATETIME2(0) NOT NULL CONSTRAINT DF_ContestRegistrations_At DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_ContestRegistrations PRIMARY KEY (UserId, ContestKey)
);
