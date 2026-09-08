using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyManagementSystem.Api.Services;

namespace PharmacyManagementSystem.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SyncController : ControllerBase
    {
        private readonly ISyncService _syncService;

        public SyncController(ISyncService syncService)
        {
            _syncService = syncService;
        }

        [HttpPost("push")]
        public async Task<IActionResult> PushSyncQueue([FromBody] SyncPushRequest request)
        {
            if (request == null || request.Items == null || request.Items.Count == 0)
            {
                return BadRequest(new { message = "No sync items provided in batch." });
            }

            var result = await _syncService.ProcessSyncBatchAsync(request);
            return Ok(result);
        }

        [HttpGet("status")]
        [AllowAnonymous]
        public IActionResult Ping()
        {
            return Ok(new
            {
                status = "online",
                timestamp = System.DateTime.UtcNow,
                version = "1.0.0",
                message = "Pharmacy Central Server is operational."
            });
        }
    }
}
