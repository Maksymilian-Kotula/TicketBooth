using Microsoft.EntityFrameworkCore;
using TicketBooth.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Wyciągamy adres bazy z pliku appsettings.json
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
// 2. Rejestrujemy AppDbContext w aplikacji
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));


// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapPost("/api/TicketBooth/build", async (AppDbContext db) => 
{
    for (int row = 1; row <= 17; row++)
    {
        for (int col = 1; col <= 30; col++) 
        {
            
            Seat newSeat = new Seat
            {
                Row = row,          
                Number = col    
            }; 

            db.Seats.Add(newSeat);
        }
    }
    
    await db.SaveChangesAsync();

    return Results.Ok("Sala w Hali LO w Skawinie została wygenerowana!");
});



app.MapGet("/api/TicketBooth/seats", async (AppDbContext db) => 
{
    var seats = await db.Seats.ToListAsync();
    
    return Results.Ok(seats);
});

app.Run();
