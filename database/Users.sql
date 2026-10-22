IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Users (
    Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    Email NVARCHAR(320) NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role VARCHAR(10) NOT NULL CONSTRAINT DF_Users_Role DEFAULT 'student' CONSTRAINT CK_Users_Role CHECK (Role IN ('student','mentor')),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Users_Email UNIQUE (Email)
  );
END;

-- Add Role column to existing databases that were created before this migration.
IF COL_LENGTH(N'dbo.Users', N'Role') IS NULL ALTER TABLE dbo.Users ADD Role VARCHAR(10) NOT NULL CONSTRAINT DF_Users_Role DEFAULT 'student' CONSTRAINT CK_Users_Role CHECK (Role IN ('student','mentor'));
