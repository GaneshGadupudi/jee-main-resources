-- =========================================================================
-- Mentor Applications and Role-Based Access Control Migration
-- =========================================================================

-- 1. Update dbo.Users to support 'admin' role
IF COL_LENGTH(N'dbo.Users', N'Role') IS NOT NULL
BEGIN
  -- Drop existing check constraint on Role
  DECLARE @ConstraintName NVARCHAR(200);
  SELECT @ConstraintName = name 
  FROM sys.check_constraints 
  WHERE parent_object_id = OBJECT_ID(N'dbo.Users') 
    AND definition LIKE '%Role%';

  IF @ConstraintName IS NOT NULL
  BEGIN
    DECLARE @DropSql NVARCHAR(500) = N'ALTER TABLE dbo.Users DROP CONSTRAINT ' + QUOTENAME(@ConstraintName) + N';';
    EXEC sp_executesql @DropSql;
  END;

  -- Ensure Role column is wide enough
  ALTER TABLE dbo.Users ALTER COLUMN Role VARCHAR(20) NOT NULL;

  -- Add updated check constraint allowing 'student', 'mentor', 'admin'
  ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('student', 'mentor', 'admin'));
END;

-- 2. Create dbo.MentorApplications table
IF OBJECT_ID(N'dbo.MentorApplications', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.MentorApplications (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MentorApplications PRIMARY KEY,
    ApplicationId NVARCHAR(50) NOT NULL CONSTRAINT UQ_MentorApplications_AppId UNIQUE,
    FullName NVARCHAR(200) NOT NULL,
    Email NVARCHAR(320) NOT NULL,
    Phone NVARCHAR(30) NOT NULL,
    HighestQualification NVARCHAR(150) NOT NULL,
    Institute NVARCHAR(250) NOT NULL,
    CurrentProfession NVARCHAR(200) NOT NULL,
    ExperienceYears INT NOT NULL CONSTRAINT DF_MentorApplications_Exp DEFAULT 0,
    Subjects NVARCHAR(500) NOT NULL,
    Bio NVARCHAR(2000) NULL,
    TeachingExperience NVARCHAR(2000) NULL,
    PreferredMode VARCHAR(20) NOT NULL CONSTRAINT DF_MentorApplications_Mode DEFAULT 'Online' CONSTRAINT CK_MentorApplications_Mode CHECK (PreferredMode IN ('Online', 'Offline', 'Hybrid')),
    LinkedInUrl NVARCHAR(500) NULL,
    TargetExams NVARCHAR(200) NULL,
    AvailabilityHours INT NULL CONSTRAINT DF_MentorApplications_Hours DEFAULT 10,
    ResumeFileName NVARCHAR(255) NOT NULL,
    ResumeOriginalName NVARCHAR(255) NOT NULL,
    ResumeFilePath NVARCHAR(500) NOT NULL,
    ResumeFileSize INT NOT NULL,
    ResumeMimeType NVARCHAR(100) NOT NULL,
    Status VARCHAR(30) NOT NULL CONSTRAINT DF_MentorApplications_Status DEFAULT 'Pending' CONSTRAINT CK_MentorApplications_Status CHECK (Status IN ('Pending', 'Under Review', 'Interview Scheduled', 'Accepted', 'Declined')),
    InterviewDate DATETIME2(0) NULL,
    InterviewTime NVARCHAR(50) NULL,
    MeetingMode VARCHAR(30) NULL,
    MeetingLink NVARCHAR(500) NULL,
    AdminNotes NVARCHAR(MAX) NULL,
    ReviewedByAdminId INT NULL CONSTRAINT FK_MentorApplications_Admin REFERENCES dbo.Users(Id) ON DELETE SET NULL,
    ReviewedAt DATETIME2(0) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MentorApplications_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MentorApplications_UpdatedAt DEFAULT SYSUTCDATETIME()
  );

  CREATE INDEX IX_MentorApplications_Status ON dbo.MentorApplications (Status, CreatedAt DESC);
  CREATE INDEX IX_MentorApplications_Email ON dbo.MentorApplications (Email);
END;

