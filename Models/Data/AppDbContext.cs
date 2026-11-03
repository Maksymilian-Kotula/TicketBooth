using Microsoft.EntityFrameworkCore;
using TicketBooth.Models;


public class AppDbContext : DbContext{

    public DbSet<Seat> Seats {get; set;}

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
        
    }
}