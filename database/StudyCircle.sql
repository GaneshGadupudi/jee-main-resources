-- Study circle: small private groups of friends with a weekly leaderboard.
--   A group is joined with a short invite code, so "friends" are simply the people in your groups.
--   Nothing is stored for the leaderboard: it is calculated from PracticeAnswers and StudyPlanTasks.
--   A group disappears when its last member leaves (or is deleted).

IF OBJECT_ID(N'dbo.StudyGroups', N'U') IS NULL
CREATE TABLE dbo.StudyGroups (
  Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_StudyGroups PRIMARY KEY,
  Name NVARCHAR(40) NOT NULL,
  InviteCode VARCHAR(8) NOT NULL CONSTRAINT UQ_StudyGroups_Code UNIQUE,
  CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_StudyGroups_CreatedAt DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID(N'dbo.StudyGroupMembers', N'U') IS NULL
CREATE TABLE dbo.StudyGroupMembers (
  GroupId INT NOT NULL CONSTRAINT FK_StudyGroupMembers_Group REFERENCES dbo.StudyGroups(Id) ON DELETE CASCADE,
  UserId INT NOT NULL CONSTRAINT FK_StudyGroupMembers_User REFERENCES dbo.Users(Id) ON DELETE CASCADE,
  JoinedAt DATETIME2(0) NOT NULL CONSTRAINT DF_StudyGroupMembers_JoinedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_StudyGroupMembers PRIMARY KEY (GroupId, UserId)
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_StudyGroupMembers_User')
CREATE INDEX IX_StudyGroupMembers_User ON dbo.StudyGroupMembers (UserId);

-- Invitations sent by a member to a registered student's email. The invitee accepts or declines in their Study circle.
-- InvitedByName is a snapshot (no second FK to Users, which SQL Server would reject as multiple cascade paths).
IF OBJECT_ID(N'dbo.StudyGroupInvites', N'U') IS NULL
CREATE TABLE dbo.StudyGroupInvites (
  GroupId INT NOT NULL CONSTRAINT FK_StudyGroupInvites_Group REFERENCES dbo.StudyGroups(Id) ON DELETE CASCADE,
  InvitedUserId INT NOT NULL CONSTRAINT FK_StudyGroupInvites_User REFERENCES dbo.Users(Id) ON DELETE CASCADE,
  InvitedByName NVARCHAR(200) NOT NULL,
  CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_StudyGroupInvites_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_StudyGroupInvites PRIMARY KEY (GroupId, InvitedUserId)
);
