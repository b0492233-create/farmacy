using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PharmacyManagementSystem.Api.Data;
using PharmacyManagementSystem.Api.Services;

namespace PharmacyManagementSystem.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SalesController : ControllerBase
    {
        private readonly IPosService _posService;
        private readonly PharmacyDbContext _db;

        public SalesController(IPosService posService, PharmacyDbContext db)
        {
            _posService = posService;
            _db = db;
        }

        [HttpPost]
        public async Task<IActionResult> CreateSale([FromBody] CreateSaleDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.IdempotencyKey))
            {
                return BadRequest(new { message = "IdempotencyKey is required for POS transactions." });
            }

            if (dto.Items == null || dto.Items.Count == 0)
            {
                return BadRequest(new { message = "الفاتورة لا تحتوي على أصناف" });
            }

            var sale = await _posService.ProcessSaleAsync(dto);
            return Ok(sale);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetSaleById(Guid id)
        {
            var sale = await _db.Sales
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (sale == null)
            {
                return NotFound(new { message = "الفاتورة غير موجودة" });
            }

            return Ok(sale);
        }

        [HttpGet]
        public async Task<IActionResult> GetSalesList([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var sales = await _db.Sales
                .OrderByDescending(s => s.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(sales);
        }
    }
}
