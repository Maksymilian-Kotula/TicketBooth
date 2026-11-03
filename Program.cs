using Microsoft.AspNetCore.Components.Endpoints;
using Microsoft.EntityFrameworkCore;
using TicketBooth.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Wyciągamy adres bazy z pliku appsettings.json
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
// 2. Rejestrujemy AppDbContext w aplikacji
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

#region 



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
#endregion


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

app.MapPut("/api/TicketBooth/reserve/{id}", async (int id, AppDbContext db) =>
{
    var seat = await db.Seats.FindAsync(id);

    if (seat == null)
    {
        return Results.NotFound("Nie znaleziono takiego miejsca");
    }
    if (seat.Status == "Zajęty"){
        return Results.BadRequest("To miejsce jest już zarezerwowane!");
    }

    seat.Status = "Zajęty";
    await db.SaveChangesAsync();
    return Results.Ok($"Miejsce w rzędzie {seat.Row} o numerze {seat.Number} zostało zarezerwowane!");

});

app.MapPut("/api/TicketBooth/cancel/{id}", async (int id, AppDbContext db) =>
{
    var seat = await db.Seats.FindAsync(id);

    if (seat == null)
    {
        return Results.NotFound("Nie znaleziono takiego miejsca");
    }
    if (seat.Status == "Wolne"){
        return Results.BadRequest("To miejsce jest nie jest jeszcze zarezerowane!");
    }

    seat.Status = "Wolne";
    await db.SaveChangesAsync();
    return Results.Ok($"Miejsce w rzędzie {seat.Row} o numerze {seat.Number} zostało zwolnione!");
});

app.Run();
