using Microsoft.AspNetCore.Components.Endpoints;
using Microsoft.EntityFrameworkCore;
using TicketBooth.Models;
using MailKit.Net.Smtp;
using MimeKit;

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
    
    var podaneHaslo = http.Request.Headers["Admin-Haslo"].ToString();
    if (podaneHaslo != "Sygnal2026!") return Results.Unauthorized();

    var seat = await db.Seats.FindAsync(id);
    if (seat == null) return Results.NotFound("Nie znaleziono takiego miejsca");
    if (seat.Status == "Wolne") return Results.BadRequest("To miejsce nie jest jeszcze zarezerwowane!");

    
    seat.Status = "Wolne";
    seat.ClientName = null;
    seat.ClientEmail = null;
    seat.ClientPhone = null;
    seat.OrderNumber = null;
    seat.ReservationTime = null;

    await db.SaveChangesAsync();
    return Results.Ok($"Miejsce w rzędzie {seat.Row} o numerze {seat.Number} zostało zwolnione!");
});

// NOWE: Szybki endpoint, który tylko sprawdza, czy wpisane hasło jest dobre
app.MapGet("/api/TicketBooth/verify-admin", (HttpContext http) =>
{
    if (http.Request.Headers["Admin-Haslo"].ToString() == "Sygnal2026!") return Results.Ok();
    return Results.Unauthorized();
});

app.MapPost("/api/TicketBooth/order/finalize", (ReservationRequest request, IConfiguration config) =>
{
    try
    {
        int cenaZaBilet = 90; 
        int sumaDoZaplaty = request.TicketCount * cenaZaBilet;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(config["EmailSettings:SenderName"], config["EmailSettings:SenderEmail"]));
        message.To.Add(new MailboxAddress(request.ClientName, request.ClientEmail));
        message.Subject = $"Instrukcje do płatności - Zamówienie {request.OrderNumber}";

        var bodyBuilder = new BodyBuilder();
        bodyBuilder.HtmlBody = $@"
            <h2 style='color: #2e7d32;'>Dziękujemy za rezerwację, {request.ClientName}!</h2>
            <p>Twoje zamówienie <b>{request.OrderNumber}</b> zostało wstępnie zarejestrowane.</p>
            <p>Aby ostatecznie potwierdzić <b>{request.TicketCount} szt.</b> miejsc, prosimy o wykonanie przelewu w ciągu 1 godziny.</p>
            <div style='background-color: #f4f4f4; padding: 15px; border-left: 4px solid #2e7d32; margin: 20px 0;'>
                <p><b>Nr konta:</b> 00 0000 0000 0000 0000 0000 0000</p>
                <p><b>Odbiorca:</b> Stowarzyszenie Orkiestra Dęta Sygnał z Radziszowa</p>
                <p><b>Liczba biletów:</b> {request.TicketCount}</p>
                <p style='font-size: 18px; color: #d32f2f;'><b>Kwota do zapłaty: {sumaDoZaplaty} zł</b> <span style='font-size: 14px; color: #555;'>(czyli {request.TicketCount} x {cenaZaBilet} zł)</span></p>
                <p><b>Tytuł przelewu:</b> {request.OrderNumber} - {request.ClientName}</p>
            </div>
            <p>Po zaksięgowaniu wpłaty, miejsca zostaną trwale przypisane do Twojego nazwiska.</p>
            <p>Do zobaczenia na koncercie!</p>
        ";

        message.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
        client.Connect(config["EmailSettings:SmtpServer"], int.Parse(config["EmailSettings:SmtpPort"]), true);
        client.Authenticate(config["EmailSettings:SenderEmail"], config["EmailSettings:SenderPassword"]);
        client.Send(message);
        client.Disconnect(true);

        return Results.Ok();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Błąd wysyłania e-maila: {ex.Message}");
        return Results.Problem("Rezerwacja zapisana, ale wystąpił błąd przy wysyłaniu maila.");
    }
});

app.Run();
