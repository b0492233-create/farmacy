using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using PharmacyManagementSystem.Api.Data;
using PharmacyManagementSystem.Api.Models;

namespace PharmacyManagementSystem.Api.Services
{
    public record LoginRequest(string Username, string Password);
    public record PinLoginRequest(string Pin, string DeviceId);
    public record AuthResponse(string Token, string Username, string FullNameAr, string Role, Guid UserId, Guid? BranchId);

    public interface IAuthService
    {
        Task<AuthResponse?> LoginAsync(LoginRequest request);
        Task<AuthResponse?> PinLoginAsync(PinLoginRequest request);
    }

    public class AuthService : IAuthService
    {
        private readonly PharmacyDbContext _db;
        private readonly IConfiguration _config;

        public AuthService(PharmacyDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        public async Task<AuthResponse?> LoginAsync(LoginRequest request)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower() && u.IsActive);
            if (user == null) return null;

            // In production verify BCrypt/Argon2 password hash
            // If valid:
            var token = GenerateJwtToken(user);
            user.LastLoginAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return new AuthResponse(token, user.Username, user.FullNameAr, user.Role, user.Id, user.BranchId);
        }

        public async Task<AuthResponse?> PinLoginAsync(PinLoginRequest request)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.QuickPin == request.Pin && u.IsActive);
            if (user == null) return null;

            var token = GenerateJwtToken(user);
            user.LastLoginAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return new AuthResponse(token, user.Username, user.FullNameAr, user.Role, user.Id, user.BranchId);
        }

        private string GenerateJwtToken(User user)
        {
            var keyString = _config["Jwt:Key"] ?? "SUPER_SECRET_PRODUCTION_KEY_FOR_PHARMACY_MANAGEMENT_SYSTEM_2026_EGYPT";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyString));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("FullNameAr", user.FullNameAr),
                new Claim("BranchId", user.BranchId?.ToString() ?? string.Empty)
            };

            var token = new JwtSecurityToken(
                issuer: "PharmacyApi",
                audience: "PharmacyClients",
                claims: claims,
                expires: DateTime.UtcNow.AddHours(14),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
