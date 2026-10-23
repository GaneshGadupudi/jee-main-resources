-- Migration: Create dbo.WrittenSolutionRequests table
-- Stores student requests for handwritten/photo mentor solutions with 30-day expiration

IF OBJECT_ID(N'dbo.WrittenSolutionRequests', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.WrittenSolutionRequests (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WrittenSolutionRequests PRIMARY KEY,
    RequestId NVARCHAR(50) NOT NULL CONSTRAINT UQ_WrittenSolutionRequests_ReqId UNIQUE,
    StudentId INT NOT NULL CONSTRAINT FK_WrittenSolutionRequests_Student FOREIGN KEY REFERENCES dbo.Users(Id),
    MentorId INT NULL CONSTRAINT FK_WrittenSolutionRequests_Mentor FOREIGN KEY REFERENCES dbo.Users(Id),
    Subject NVARCHAR(100) NOT NULL,
    Chapter NVARCHAR(150) NULL,
    QuestionText NVARCHAR(MAX) NOT NULL,
    QuestionImageUrl NVARCHAR(500) NULL,
    Status VARCHAR(30) NOT NULL CONSTRAINT DF_WrittenSolutionRequests_Status DEFAULT 'Pending' CONSTRAINT CK_WrittenSolutionRequests_Status CHECK (Status IN ('Pending', 'Assigned', 'Completed', 'Expired')),
    SolutionImageFileName NVARCHAR(255) NULL,
    SolutionImageOriginalName NVARCHAR(255) NULL,
    SolutionImageFilePath NVARCHAR(500) NULL,
    SolutionImageMimeType NVARCHAR(100) NULL,
    SolutionImageFileSize INT NULL,
    MentorNotes NVARCHAR(1000) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_WrittenSolutionRequests_Created DEFAULT SYSUTCDATETIME(),
    AssignedAt DATETIME2 NULL,
    SolvedAt DATETIME2 NULL,
    ExpiresAt DATETIME2 NULL,
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_WrittenSolutionRequests_Updated DEFAULT SYSUTCDATETIME()
  );

  CREATE INDEX IX_WrittenSolutionRequests_StudentId ON dbo.WrittenSolutionRequests (StudentId);
  CREATE INDEX IX_WrittenSolutionRequests_MentorId ON dbo.WrittenSolutionRequests (MentorId);
  CREATE INDEX IX_WrittenSolutionRequests_Status ON dbo.WrittenSolutionRequests (Status);
  CREATE INDEX IX_WrittenSolutionRequests_ExpiresAt ON dbo.WrittenSolutionRequests (ExpiresAt);

  PRINT 'Table dbo.WrittenSolutionRequests created successfully.';
END
ELSE
BEGIN
  PRINT 'Table dbo.WrittenSolutionRequests already exists.';
END;

