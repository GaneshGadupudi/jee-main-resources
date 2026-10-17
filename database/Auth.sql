-- Password reset links. Only a hash of the token is stored, so a copy of this table cannot be used to reset anyone's password.
-- A token works once, for one hour (ExpiresAt), and requesting a new link voids the older ones.
IF OBJECT_ID(N'dbo.PasswordResetTokens', N'U') IS NULL
CREATE TABLE dbo.PasswordResetTokens (
  Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PasswordResetTokens PRIMARY KEY,
  UserId INT NOT NULL CONSTRAINT FK_PasswordResetTokens_User REFERENCES dbo.Users(Id) ON DELETE CASCADE,
  TokenHash BINARY(32) NOT NULL CONSTRAINT UQ_PasswordResetTokens_Hash UNIQUE,
  ExpiresAt DATETIME2(0) NOT NULL,
  UsedAt DATETIME2(0) NULL,
  CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_PasswordResetTokens_CreatedAt DEFAULT SYSUTCDATETIME()
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PasswordResetTokens_User')
CREATE INDEX IX_PasswordResetTokens_User ON dbo.PasswordResetTokens (UserId, CreatedAt DESC);
