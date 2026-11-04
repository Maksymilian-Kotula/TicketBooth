namespace TicketBooth.Models;

public class Seat
{
    public int Id { get; set; }
    public int Row { get; set; }
    public int Number { get; set; }
    public string Status { get; set; } = "Wolne"; // Statusy: Wolne, Oczekuje, Opłacone
    
    public string? ClientName { get; set; }
    public string? ClientEmail { get; set; }
    public string? ClientPhone { get; set; }
    
    // NOWE POLA
    public string? OrderNumber { get; set; }
    public DateTime? ReservationTime { get; set; }
}

public class ReservationRequest
{
    public string ClientName { get; set; } = "";
    public string ClientEmail { get; set; } = "";
    public string ClientPhone { get; set; } = "";
    // Odbieramy numer zamówienia z koszyka
    public string OrderNumber { get; set; } = ""; 
}