using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyManagementSystem.Api.Services;

namespace PharmacyManagementSystem.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var response = await _authService.LoginAsync(request);
            if (response == null)
            {
                return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة" });
            }

            return Ok(response);
        }

        [HttpPost("pin-login")]
        [AllowAnonymous]
        public async Task<IActionResult> PinLogin([FromBody] PinLoginRequest request)
        {
            var response = await _authService.PinLoginAsync(request);
            if (response == null)
            {
                return Unauthorized(new { message = "رمز PIN غير صحيح أو المستخدم غير مفعّل" });
            }

            return Ok(response);
        }

        [HttpGet("me")]
        [Authorize]
        public IActionResult GetCurrentUser()
        {
            return Ok(new
            {
                username = User.Identity?.Name,
                role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value,
                fullNameAr = User.FindFirst("FullNameAr")?.Value,
                branchId = User.FindFirst("BranchId")?.Value
            });
        }
    }
}
