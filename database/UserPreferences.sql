-- Onboarding / profile answers (one row per user). Written by PUT /api/preferences.
IF OBJECT_ID(N'dbo.UserPreferences', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.UserPreferences (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_UserPreferences PRIMARY KEY,
    UserId INT NOT NULL CONSTRAINT FK_UserPreferences_User REFERENCES dbo.Users(Id) ON DELETE CASCADE,
    TargetExam NVARCHAR(100) NOT NULL,
    ExamDate DATE NOT NULL,
    PreparationStage NVARCHAR(100) NOT NULL,
    DailyHours NVARCHAR(50) NOT NULL,
    Exams NVARCHAR(500) NULL,
    Strengths NVARCHAR(500) NULL,
    FocusSubjects NVARCHAR(500) NULL,
    Goal NVARCHAR(1000) NULL,
    GoalPercentile TINYINT NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_UserPreferences_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_UserPreferences_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_UserPreferences_User UNIQUE (UserId)
  );
END;

-- Idempotent: add the goal-percentile column to databases created before it existed.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE name = N'GoalPercentile' AND object_id = OBJECT_ID(N'dbo.UserPreferences'))
ALTER TABLE dbo.UserPreferences ADD GoalPercentile TINYINT NULL;
