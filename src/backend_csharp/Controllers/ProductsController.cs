using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PharmacyManagementSystem.Api.Data;
using PharmacyManagementSystem.Api.Models;

namespace PharmacyManagementSystem.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly PharmacyDbContext _db;

        public ProductsController(PharmacyDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] Guid? categoryId)
        {
            var query = _db.Products
                .Include(p => p.Batches)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(p =>
                    p.NameAr.ToLower().Contains(s) ||
                    p.Barcode.Contains(s) ||
                    p.InternalCode.ToLower().Contains(s) ||
                    p.ActiveIngredient.ToLower().Contains(s)
                );
            }

            if (categoryId.HasValue)
            {
                query = query.Where(p => p.CategoryId == categoryId.Value);
            }

            var products = await query.ToListAsync();
            return Ok(products);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var product = await _db.Products
                .Include(p => p.Batches)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null)
            {
                return NotFound(new { message = "الدواء غير موجود" });
            }

            return Ok(product);
        }

        [HttpGet("barcode/{barcode}")]
        public async Task<IActionResult> GetByBarcode(string barcode)
        {
            var product = await _db.Products
                .Include(p => p.Batches)
                .FirstOrDefaultAsync(p => p.Barcode == barcode);

            if (product == null)
            {
                return NotFound(new { message = "لم يتم العثور على دواء بهذا الباركود" });
            }

            return Ok(product);
        }

        [HttpPost]
        [Authorize(Roles = "admin,manager")]
        public async Task<IActionResult> Create([FromBody] Product product)
        {
            var exists = await _db.Products.AnyAsync(p => p.Barcode == product.Barcode);
            if (exists)
            {
                return Conflict(new { message = "الباركود مسجل بالفعل لدواء آخر" });
            }

            product.Id = Guid.NewGuid();
            product.CreatedAt = DateTime.UtcNow;
            product.UpdatedAt = DateTime.UtcNow;

            _db.Products.Add(product);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
        }

        [HttpGet("expiring")]
        public async Task<IActionResult> GetExpiringBatches([FromQuery] int days = 90)
        {
            var threshold = DateTime.UtcNow.AddDays(days);
            var batches = await _db.Batches
                .Include(b => b.Product)
                .Where(b => b.Quantity > 0 && b.ExpiryDate <= threshold)
                .OrderBy(b => b.ExpiryDate)
                .ToListAsync();

            return Ok(batches);
        }
    }
}
