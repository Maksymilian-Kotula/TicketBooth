let koszyk = []; // Tutaj trzymamy ID miejsc, które kliknął użytkownik
let wszystkieKrzesla = []; // Tutaj trzymamy dane z bazy, by móc wypisać numer rzędu w koszyku

async function ladujMiejsca() {
    const odpowiedz = await fetch('/api/TicketBooth/seats');
    wszystkieKrzesla = await odpowiedz.json();
    odswiezWidok();
}

// Funkcja rysująca salę na podstawie pobranych danych i zawartości koszyka
function odswiezWidok() {
    const mapa = document.getElementById('seat-map');
    mapa.innerHTML = ''; 

    wszystkieKrzesla.forEach(krzeslo => {
        const kwadracik = document.createElement('div');
        kwadracik.classList.add('seat');
        kwadracik.textContent = krzeslo.number; 
        kwadracik.title = `Rząd: ${krzeslo.row}, Miejsce: ${krzeslo.number}`; 
        
        const kolumnaSiatki = krzeslo.number <= 15 ? krzeslo.number : krzeslo.number + 1;
        const rzadSiatki = krzeslo.row <= 6 ? krzeslo.row : krzeslo.row + 1;
        kwadracik.style.gridColumn = kolumnaSiatki;
        kwadracik.style.gridRow = rzadSiatki;

        // Logika kolorów i klikania dla klienta
        if (krzeslo.status !== "Wolne") {
            kwadracik.classList.add('zajete');
            // Miejsca zajętego nie da się kliknąć
        } else {
            // Jeśli jest wolne w bazie, sprawdzamy, czy klient ma je w koszyku
            if (koszyk.includes(krzeslo.id)) {
                kwadracik.classList.add('wybrane');
            } else {
                kwadracik.classList.add('wolne');
            }
            kwadracik.onclick = () => przelaczMiejsce(krzeslo.id);
        }
        
        mapa.appendChild(kwadracik);
    });
    
    odswiezKoszyk(); // Po narysowaniu sali, aktualizujemy tekst w koszyku
}

// Dodawanie/usuwanie z koszyka
function przelaczMiejsce(id) {
    if (koszyk.includes(id)) {
        koszyk = koszyk.filter(k => k !== id); // Wyrzuć z koszyka
    } else {
        koszyk.push(id); // Dodaj do koszyka
    }
    odswiezWidok(); // Przebuduj salę, by zaktualizować kolory
}

// Wypisywanie informacji na dole strony
function odswiezKoszyk() {
    const listaDiv = document.getElementById('koszyk-lista');
    const btnKup = document.getElementById('btn-kup');

    if (koszyk.length === 0) {
        listaDiv.innerHTML = "Brak wybranych miejsc.";
        btnKup.disabled = true;
    } else {
        // Zbieramy dane o wybranych krzesłach z pełnej listy
        const wybraneDetale = koszyk.map(id => wszystkieKrzesla.find(k => k.id === id));
        
        let tekst = wybraneDetale.map(k => `Rząd ${k.row}, Miejsce ${k.number}`).join('<br>');
        listaDiv.innerHTML = `Liczba biletów: ${koszyk.length}<br><br>${tekst}`;
        btnKup.disabled = false;
    }
}

// Finalizacja zakupów (wysłanie do backendu)
async function kupBilety() {
    const btnKup = document.getElementById('btn-kup');
    btnKup.disabled = true;
    btnKup.textContent = "Przetwarzanie...";

    // Wysyłamy zapytanie PUT dla każdego miejsca w koszyku równolegle
    const zapytania = koszyk.map(id => fetch(`/api/TicketBooth/reserve/${id}`, { method: 'PUT' }));
    await Promise.all(zapytania);
    
    alert("Dziękujemy! Bilety zostały zarezerwowane.");
    
    // Czyszczenie i restart widoku
    koszyk = [];
    btnKup.textContent = "Zarezerwuj bilety";
    ladujMiejsca(); 
}

ladujMiejsca();