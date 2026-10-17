IF OBJECT_ID(N'dbo.PyqSubjects', N'U') IS NULL
CREATE TABLE dbo.PyqSubjects (
  Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PyqSubjects PRIMARY KEY,
  Slug VARCHAR(60) NOT NULL CONSTRAINT UQ_PyqSubjects_Slug UNIQUE,
  Name NVARCHAR(100) NOT NULL
);

IF OBJECT_ID(N'dbo.PyqChapters', N'U') IS NULL
CREATE TABLE dbo.PyqChapters (
  Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PyqChapters PRIMARY KEY,
  SubjectId INT NOT NULL CONSTRAINT FK_PyqChapters_Subject REFERENCES dbo.PyqSubjects(Id),
  Slug VARCHAR(80) NOT NULL,
  Name NVARCHAR(150) NOT NULL,
  CONSTRAINT UQ_PyqChapters UNIQUE (SubjectId, Slug)
);

IF OBJECT_ID(N'dbo.PyqTopics', N'U') IS NULL
CREATE TABLE dbo.PyqTopics (
  Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PyqTopics PRIMARY KEY,
  ChapterId INT NOT NULL CONSTRAINT FK_PyqTopics_Chapter REFERENCES dbo.PyqChapters(Id),
  Slug VARCHAR(80) NOT NULL,
  Name NVARCHAR(150) NOT NULL,
  CONSTRAINT UQ_PyqTopics UNIQUE (ChapterId, Slug)
);

-- Status workflow: Draft -> Published (or Rejected). Students only ever see Published.
IF OBJECT_ID(N'dbo.PyqQuestions', N'U') IS NULL
CREATE TABLE dbo.PyqQuestions (
  Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PyqQuestions PRIMARY KEY,
  TopicId INT NULL CONSTRAINT FK_PyqQuestions_Topic REFERENCES dbo.PyqTopics(Id),
  Exam NVARCHAR(30) NOT NULL,
  [Year] SMALLINT NOT NULL,
  Shift NVARCHAR(60) NULL,
  SourceQuestionId NVARCHAR(40) NULL,         -- NTA question id, used to match the answer key
  QuestionType VARCHAR(10) NOT NULL CONSTRAINT CK_PyqQuestions_Type CHECK (QuestionType IN ('MCQ','MULTI','NUMERIC')),
  QuestionText NVARCHAR(MAX) NOT NULL,        -- may contain LaTeX
  QuestionImageUrl NVARCHAR(500) NULL,
  CorrectNumeric DECIMAL(18,4) NULL,
  Explanation NVARCHAR(MAX) NULL,
  Difficulty TINYINT NULL,
  SourceFile NVARCHAR(260) NULL,
  SourcePage INT NULL,
  Status VARCHAR(10) NOT NULL CONSTRAINT DF_PyqQuestions_Status DEFAULT 'Draft'
    CONSTRAINT CK_PyqQuestions_Status CHECK (Status IN ('Draft','Published','Rejected')),
  ReviewedBy INT NULL CONSTRAINT FK_PyqQuestions_ReviewedBy REFERENCES dbo.Users(Id),
  ReviewedAt DATETIME2(0) NULL,
  CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PyqQuestions_CreatedAt DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PyqQuestions_UpdatedAt DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PyqQuestions_Filter')
CREATE INDEX IX_PyqQuestions_Filter ON dbo.PyqQuestions (Status, TopicId, Exam, [Year]);

-- Prevents importing the same official question twice.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_PyqQuestions_Source')
CREATE UNIQUE INDEX UX_PyqQuestions_Source ON dbo.PyqQuestions (Exam, [Year], Shift, SourceQuestionId) WHERE SourceQuestionId IS NOT NULL;

IF OBJECT_ID(N'dbo.PyqOptions', N'U') IS NULL
CREATE TABLE dbo.PyqOptions (
  Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PyqOptions PRIMARY KEY,
  QuestionId INT NOT NULL CONSTRAINT FK_PyqOptions_Question REFERENCES dbo.PyqQuestions(Id) ON DELETE CASCADE,
  OptionIndex TINYINT NOT NULL,
  OptionText NVARCHAR(MAX) NOT NULL,
  IsCorrect BIT NOT NULL CONSTRAINT DF_PyqOptions_IsCorrect DEFAULT 0,
  CONSTRAINT UQ_PyqOptions UNIQUE (QuestionId, OptionIndex)
);

IF OBJECT_ID(N'dbo.PyqAttempts', N'U') IS NULL
CREATE TABLE dbo.PyqAttempts (
  Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PyqAttempts PRIMARY KEY,
  UserId INT NOT NULL CONSTRAINT FK_PyqAttempts_User REFERENCES dbo.Users(Id),
  QuestionId INT NOT NULL CONSTRAINT FK_PyqAttempts_Question REFERENCES dbo.PyqQuestions(Id) ON DELETE CASCADE,
  Answer NVARCHAR(100) NOT NULL,              -- "2" or "0,2" for options, or the numeric value
  IsCorrect BIT NOT NULL,
  AttemptedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PyqAttempts_At DEFAULT SYSUTCDATETIME()
);
