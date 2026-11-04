using Microsoft.AspNetCore.Components.Endpoints;
using Microsoft.EntityFrameworkCore;
using TicketBooth.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Wyciągamy adres bazy z pliku appsettings.json
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
// 2. Rejestrujemy AppDbContext w aplikacji
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

builder.Services.AddCors();
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

app.UseDefaultFiles(); // Sprawia, że wejście na główny adres automatycznie ładuje index.html
app.UseStaticFiles();  // Pozwala aplikacji czytać i udostępniać pliki z folderu wwwroot

app.UseCors(x => x.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin());

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

app.MapPut("/api/TicketBooth/reserve/{id}", async (int id, ReservationRequest? request, HttpContext http, AppDbContext db) =>
{
    if (request == null || string.IsNullOrWhiteSpace(request.ClientName))
    {
        var podaneHaslo = http.Request.Headers["Admin-Haslo"].ToString();
        if (podaneHaslo != "Sygnal2026!") return Results.Unauthorized();
    }

    var seat = await db.Seats.FindAsync(id);
    if (seat == null) return Results.NotFound();
    if (seat.Status != "Wolne") return Results.BadRequest();

    // Nowy status i zapisanie czasu
    seat.Status = "Oczekuje";
    
    if (request != null)
    {
        seat.ClientName = request.ClientName;
        seat.ClientEmail = request.ClientEmail;
        seat.ClientPhone = request.ClientPhone;
        seat.OrderNumber = request.OrderNumber;
        seat.ReservationTime = DateTime.Now; // Zapisujemy dokładną godzinę kliknięcia
    }

    await db.SaveChangesAsync();
    return Results.Ok();
});

// Akceptacja całego zamówienia przez Admina
app.MapPut("/api/TicketBooth/order/{orderNumber}/confirm", async (string orderNumber, HttpContext http, AppDbContext db) =>
{
    if (http.Request.Headers["Admin-Haslo"].ToString() != "Sygnal2026!") return Results.Unauthorized();

    var seats = await db.Seats.Where(s => s.OrderNumber == orderNumber).ToListAsync();
    foreach (var seat in seats) { seat.Status = "Opłacone"; }
    
    await db.SaveChangesAsync();
    return Results.Ok();
});

//  Usunięcie całego zamówienia (np. brak wpłaty)
app.MapPut("/api/TicketBooth/order/{orderNumber}/cancel", async (string orderNumber, HttpContext http, AppDbContext db) =>
{
    if (http.Request.Headers["Admin-Haslo"].ToString() != "Sygnal2026!") return Results.Unauthorized();

    var seats = await db.Seats.Where(s => s.OrderNumber == orderNumber).ToListAsync();
    foreach (var seat in seats) 
    { 
        seat.Status = "Wolne";
        seat.ClientName = null; seat.ClientEmail = null; seat.ClientPhone = null;
        seat.OrderNumber = null; seat.ReservationTime = null;
    }
    
    await db.SaveChangesAsync();
    return Results.Ok();
});

app.MapPut("/api/TicketBooth/cancel/{id}", async (int id, HttpContext http, AppDbContext db) =>
{
    // Zwalniać miejsca może TYLKO Admin, więc zawsze wymagamy hasła
    var podaneHaslo = http.Request.Headers["Admin-Haslo"].ToString();
    if (podaneHaslo != "Sygnal2026!") return Results.Unauthorized();

    var seat = await db.Seats.FindAsync(id);
    if (seat == null) return Results.NotFound("Nie znaleziono takiego miejsca");
    if (seat.Status == "Wolne") return Results.BadRequest("To miejsce nie jest jeszcze zarezerwowane!");

    seat.Status = "Wolne";
    seat.ClientName = null;
    seat.ClientEmail = null;
    seat.ClientPhone = null;

    await db.SaveChangesAsync();
    return Results.Ok($"Miejsce w rzędzie {seat.Row} o numerze {seat.Number} zostało zwolnione!");
});

app.Run();
