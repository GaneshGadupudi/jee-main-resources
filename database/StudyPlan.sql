-- Daily study plan.
--   replaces localStorage: jee-plan, jee-completed, jee-done, jee-scores, jee-chapters-done

-- One plan per user per day. Signature = the preferences the plan was built from, so it is rebuilt when they change.
IF OBJECT_ID(N'dbo.StudyPlans', N'U') IS NULL
CREATE TABLE dbo.StudyPlans (
  Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_StudyPlans PRIMARY KEY,
  UserId INT NOT NULL CONSTRAINT FK_StudyPlans_User REFERENCES dbo.Users(Id) ON DELETE CASCADE,
  PlanDate DATE NOT NULL,
  Signature NVARCHAR(500) NOT NULL,
  CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_StudyPlans_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_StudyPlans_UserDate UNIQUE (UserId, PlanDate)
);

-- Tasks inside a plan. Completion and the score of the task's practice set live on the task row itself.
IF OBJECT_ID(N'dbo.StudyPlanTasks', N'U') IS NULL
CREATE TABLE dbo.StudyPlanTasks (
  Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_StudyPlanTasks PRIMARY KEY,
  PlanId INT NOT NULL CONSTRAINT FK_StudyPlanTasks_Plan REFERENCES dbo.StudyPlans(Id) ON DELETE CASCADE,
  TaskKey NVARCHAR(150) NOT NULL,               -- e.g. 'study:Physics:Kinematics', 'mistakes', 'block'
  SortOrder TINYINT NOT NULL,
  TaskType VARCHAR(10) NOT NULL CONSTRAINT CK_StudyPlanTasks_Type CHECK (TaskType IN ('chapter','mistakes','routine')),
  Title NVARCHAR(300) NOT NULL,
  Subject NVARCHAR(50) NULL,
  ChapterKey NVARCHAR(150) NULL,                -- e.g. 'Physics:Kinematics' (only for chapter tasks)
  Chapter NVARCHAR(150) NULL,
  [File] NVARCHAR(260) NULL,                    -- study-notes PDF for the chapter
  Weight DECIMAL(4,2) NULL,
  Minutes SMALLINT NOT NULL,
  IsCompleted BIT NOT NULL CONSTRAINT DF_StudyPlanTasks_IsCompleted DEFAULT 0,
  CompletedAt DATETIME2(0) NULL,
  ScoreCorrect SMALLINT NULL,
  ScoreTotal SMALLINT NULL,
  CONSTRAINT UQ_StudyPlanTasks_PlanKey UNIQUE (PlanId, TaskKey)
);

-- Chapters a student has finished at least once; the planner skips these until every chapter has been covered.
IF OBJECT_ID(N'dbo.ChapterProgress', N'U') IS NULL
CREATE TABLE dbo.ChapterProgress (
  UserId INT NOT NULL CONSTRAINT FK_ChapterProgress_User REFERENCES dbo.Users(Id) ON DELETE CASCADE,
  ChapterKey NVARCHAR(150) NOT NULL,
  CompletedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ChapterProgress_CompletedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_ChapterProgress PRIMARY KEY (UserId, ChapterKey)
);
