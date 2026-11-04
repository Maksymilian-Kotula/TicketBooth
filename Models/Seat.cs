namespace TicketBooth.Models;

public class Seat
{
    public int Id { get; set; }
    public int Row { get; set; }
    public int Number { get; set; }
    public string Status { get; set; } = "Wolne";
    
    public string? ClientName { get; set; }
    public string? ClientEmail { get; set; }
    public string? ClientPhone { get; set; }
}

// Klasa pomocnicza do odbierania danych z frontendu
public class ReservationRequest
{
    public string ClientName { get; set; } = "";
    public string ClientEmail { get; set; } = "";
    public string ClientPhone { get; set; } = "";
}