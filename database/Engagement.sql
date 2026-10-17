-- Settings, notifications and mentor requests.
--   replaces localStorage: jee-theme, jee-notif-read (and the in-memory "mentor requested" flag)
-- MentorRequests is worked through by the admin at /admin/mentor-requests.

IF OBJECT_ID(N'dbo.UserSettings', N'U') IS NULL
CREATE TABLE dbo.UserSettings (
  UserId INT NOT NULL CONSTRAINT PK_UserSettings PRIMARY KEY CONSTRAINT FK_UserSettings_User REFERENCES dbo.Users(Id) ON DELETE CASCADE,
  Theme VARCHAR(5) NOT NULL CONSTRAINT DF_UserSettings_Theme DEFAULT 'light' CONSTRAINT CK_UserSettings_Theme CHECK (Theme IN ('light','dark')),
  UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_UserSettings_UpdatedAt DEFAULT SYSUTCDATETIME()
);

-- Notifications are generated from the student's activity, so only the "read" state is stored.
IF OBJECT_ID(N'dbo.NotificationReads', N'U') IS NULL
CREATE TABLE dbo.NotificationReads (
  UserId INT NOT NULL CONSTRAINT FK_NotificationReads_User REFERENCES dbo.Users(Id) ON DELETE CASCADE,
  NotificationKey NVARCHAR(150) NOT NULL,
  ReadAt DATETIME2(0) NOT NULL CONSTRAINT DF_NotificationReads_At DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_NotificationReads PRIMARY KEY (UserId, NotificationKey)
);

IF OBJECT_ID(N'dbo.MentorRequests', N'U') IS NULL
CREATE TABLE dbo.MentorRequests (
  Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MentorRequests PRIMARY KEY,
  UserId INT NOT NULL CONSTRAINT FK_MentorRequests_User REFERENCES dbo.Users(Id) ON DELETE CASCADE,
  Context NVARCHAR(1000) NULL,                   -- e.g. the question the student was stuck on
  Status VARCHAR(10) NOT NULL CONSTRAINT DF_MentorRequests_Status DEFAULT 'Open'
    CONSTRAINT CK_MentorRequests_Status CHECK (Status IN ('Open','Assigned','Closed')),
  AssignedTo NVARCHAR(100) NULL,                -- mentor chosen by the admin
  AdminNote NVARCHAR(1000) NULL,                -- internal note, never shown to the student
  CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MentorRequests_CreatedAt DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MentorRequests_UpdatedAt DEFAULT SYSUTCDATETIME()
);

-- Databases created before the admin inbox existed: add the new columns.
IF COL_LENGTH(N'dbo.MentorRequests', N'AssignedTo') IS NULL ALTER TABLE dbo.MentorRequests ADD AssignedTo NVARCHAR(100) NULL;
IF COL_LENGTH(N'dbo.MentorRequests', N'AdminNote') IS NULL ALTER TABLE dbo.MentorRequests ADD AdminNote NVARCHAR(1000) NULL;
IF COL_LENGTH(N'dbo.MentorRequests', N'UpdatedAt') IS NULL ALTER TABLE dbo.MentorRequests ADD UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MentorRequests_UpdatedAt DEFAULT SYSUTCDATETIME();
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MentorRequests_Status') CREATE INDEX IX_MentorRequests_Status ON dbo.MentorRequests (Status, CreatedAt DESC);
