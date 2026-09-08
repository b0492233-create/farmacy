using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PharmacyManagementSystem.Api.Data;
using PharmacyManagementSystem.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Database Connection (PostgreSQL)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Port=5432;Database=pharmacy_prod_db;Username=postgres;Password=secure_postgres_pass";

builder.Services.AddDbContext<PharmacyDbContext>(options =>
    options.UseNpgsql(connectionString));

// 2. JWT Authentication & RBAC Authorization
var jwtKey = builder.Configuration["Jwt:Key"] ?? "SUPER_SECRET_PRODUCTION_KEY_FOR_PHARMACY_MANAGEMENT_SYSTEM_2026_EGYPT";
var key = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // Allow local network HTTP
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("admin"));
    options.AddPolicy("ManagerOrAdmin", policy => policy.RequireRole("admin", "manager"));
    options.AddPolicy("CashierAccess", policy => policy.RequireRole("admin", "manager", "cashier"));
});

// 3. DI Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISyncService, SyncService>();
builder.Services.AddScoped<IPosService, PosService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// 4. Swagger with JWT Support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Pharmacy Management System API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Enter JWT Bearer token: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// 5. CORS for Local LAN & Desktop/Mobile Devices
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAllLocalNetwork", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowAllLocalNetwork");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Bind to 0.0.0.0 so all Local Network Wi-Fi devices (Windows POS, Android) can reach the server
app.Run("http://0.0.0.0:5000");
