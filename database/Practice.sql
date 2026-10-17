-- Practice activity and the mistake book.
--   replaces localStorage: jee-answers, jee-mistakes
-- (PYQ answers are stored separately in dbo.PyqAttempts, see PYQ.sql.)

-- Every answered practice question; progress, accuracy and streaks are calculated from this.
IF OBJECT_ID(N'dbo.PracticeAnswers', N'U') IS NULL
CREATE TABLE dbo.PracticeAnswers (
  Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PracticeAnswers PRIMARY KEY,
  UserId INT NOT NULL CONSTRAINT FK_PracticeAnswers_User REFERENCES dbo.Users(Id) ON DELETE CASCADE,
  AnsweredOn DATE NOT NULL,                      -- student's local day (streaks are per local day)
  Source VARCHAR(10) NOT NULL CONSTRAINT CK_PracticeAnswers_Source CHECK (Source IN ('daily','plan','mock','contest')),
  Subject NVARCHAR(50) NOT NULL,
  Chapter NVARCHAR(150) NOT NULL,
  QuestionText NVARCHAR(1000) NOT NULL,
  IsCorrect BIT NOT NULL,
  AnsweredAt DATETIME2(0) NOT NULL CONSTRAINT DF_PracticeAnswers_AnsweredAt DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PracticeAnswers_UserDay')
CREATE INDEX IX_PracticeAnswers_UserDay ON dbo.PracticeAnswers (UserId, AnsweredOn) INCLUDE (Source, Subject, Chapter, IsCorrect);

-- The student's personal revision list. One row per distinct question.
IF OBJECT_ID(N'dbo.MistakeBook', N'U') IS NULL
CREATE TABLE dbo.MistakeBook (
  Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MistakeBook PRIMARY KEY,
  UserId INT NOT NULL CONSTRAINT FK_MistakeBook_User REFERENCES dbo.Users(Id) ON DELETE CASCADE,
  Subject NVARCHAR(50) NOT NULL,
  Chapter NVARCHAR(150) NOT NULL,
  QuestionText NVARCHAR(1000) NOT NULL,
  QuestionHash AS CAST(HASHBYTES('SHA2_256', QuestionText) AS BINARY(32)) PERSISTED,
  OptionsJson NVARCHAR(MAX) NOT NULL CONSTRAINT CK_MistakeBook_Options CHECK (ISJSON(OptionsJson) = 1),
  CorrectOption TINYINT NOT NULL,
  Explanation NVARCHAR(MAX) NULL,
  Reason NVARCHAR(100) NULL,                     -- why the student got it wrong
  IsRevisited BIT NOT NULL CONSTRAINT DF_MistakeBook_IsRevisited DEFAULT 0,
  CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MistakeBook_CreatedAt DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MistakeBook_UpdatedAt DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_MistakeBook_UserQuestion')
CREATE UNIQUE INDEX UX_MistakeBook_UserQuestion ON dbo.MistakeBook (UserId, QuestionHash);
