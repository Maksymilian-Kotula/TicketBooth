let hasloAdmina = "";
let doZablokowania = [];
let doZwolnienia = [];
let wszystkieKrzesla = [];

// NOWE: Funkcja logowania
async function zaloguj() {
    const wpisaneHaslo = document.getElementById('admin-haslo-input').value;
    if (!wpisaneHaslo) {
        alert("Podaj hasło!");
        return;
    }

    // Pytamy nasz nowy endpoint w C#, czy hasło pasuje
    const odpowiedz = await fetch('/api/TicketBooth/verify-admin', {
        headers: { 'Admin-Haslo': wpisaneHaslo }
    });

    if (odpowiedz.ok) {
        hasloAdmina = wpisaneHaslo;
        document.getElementById('ekran-logowania').style.display = 'none';
        document.getElementById('panel-admina').style.display = 'block';
        ladujMiejsca(); 
    } else {
        alert("Błędne hasło administratora! Odmowa dostępu.");
    }
}

// Funkcje akcji na zamówieniach (zabezpieczone obsługą błędów)
async function potwierdzZamowienie(nr) {
    if(confirm(`Potwierdzić wpłatę dla zamówienia ${nr}? Miejsca zostaną zablokowane na stałe.`)) {
        const odp = await fetch(`/api/TicketBooth/order/${nr}/confirm`, { method: 'PUT', headers: { 'Admin-Haslo': hasloAdmina } });
        if(odp.ok) {
            ladujMiejsca();
        } else {
            alert("Brak uprawnień. Upewnij się, że jesteś zalogowany poprawnym hasłem.");
        }
    }
}

async function anulujZamowienie(nr) {
    if(confirm(`Brak wpłaty dla ${nr}? Miejsca wrócą do puli biletów.`)) {
        const odp = await fetch(`/api/TicketBooth/order/${nr}/cancel`, { method: 'PUT', headers: { 'Admin-Haslo': hasloAdmina } });
        if(odp.ok) {
            alert("Zamówienie anulowane. Wszystkie miejsca z tej grupy wróciły do puli.");
            ladujMiejsca();
        } else {
            alert("Brak uprawnień. Upewnij się, że jesteś zalogowany poprawnym hasłem.");
        }
    }
}

async function ladujMiejsca() {
    const odpowiedz = await fetch('/api/TicketBooth/seats');
    wszystkieKrzesla = await odpowiedz.json();
    odswiezWidok();
}

function odswiezWidok() {
    const mapa = document.getElementById('seat-map');
    mapa.innerHTML = ''; 

    wszystkieKrzesla.forEach(krzeslo => {
        const kwadracik = document.createElement('div');
        kwadracik.classList.add('seat');
        kwadracik.textContent = krzeslo.number; 
        
        const kolumnaSiatki = krzeslo.number <= 15 ? krzeslo.number : krzeslo.number + 1;
        const rzadSiatki = krzeslo.row <= 6 ? krzeslo.row : krzeslo.row + 1;
        kwadracik.style.gridColumn = kolumnaSiatki;
        kwadracik.style.gridRow = rzadSiatki;

        const nazwaKlienta = krzeslo.clientName || 'Brak danych';
        const telefonKlienta = krzeslo.clientPhone || '-';

        if (krzeslo.status !== "Wolne") {
            const chmurka = `Rząd: ${krzeslo.row}, M: ${krzeslo.number}\nKlient: ${nazwaKlienta}\nTel: ${telefonKlienta}`;
            if (doZwolnienia.includes(krzeslo.id)) {
                kwadracik.classList.add('admin-do-zwolnienia');
                kwadracik.title = `Oznaczone do ZWOLNIENIA\n${chmurka}`;
            } else {
                kwadracik.classList.add('admin-zajete');
                kwadracik.title = `Zajęte - kliknij, by zwolnić\n${chmurka}`;
            }
        } else {
            if (doZablokowania.includes(krzeslo.id)) {
                kwadracik.classList.add('admin-do-zablokowania');
                kwadracik.title = `Oznaczone do ZABLOKOWANIA\nRząd: ${krzeslo.row}, M: ${krzeslo.number}`;
            } else {
                kwadracik.classList.add('wolne');
                kwadracik.title = `Wolne - kliknij, by zablokować\nRząd: ${krzeslo.row}, M: ${krzeslo.number}`;
            }
        }
        
        kwadracik.onclick = () => przelaczMiejsce(krzeslo);
        mapa.appendChild(kwadracik);
    });
    
    odswiezPanel();
    budujTabeleRezerwacji();
}

function przelaczMiejsce(krzeslo) {
    if (krzeslo.status !== "Wolne") {
        if (doZwolnienia.includes(krzeslo.id)) { doZwolnienia = doZwolnienia.filter(id => id !== krzeslo.id); } 
        else { doZwolnienia.push(krzeslo.id); }
    } else {
        if (doZablokowania.includes(krzeslo.id)) { doZablokowania = doZablokowania.filter(id => id !== krzeslo.id); } 
        else { doZablokowania.push(krzeslo.id); }
    }
    odswiezWidok();
}

function odswiezPanel() {
    const listaDiv = document.getElementById('admin-lista');
    const btnWykonaj = document.getElementById('btn-wykonaj');

    if (doZablokowania.length === 0 && doZwolnienia.length === 0) {
        listaDiv.innerHTML = "Brak zaznaczonych zmian.";
        btnWykonaj.disabled = true;
    } else {
        let tekst = "";
        if (doZablokowania.length > 0) {
            tekst += `<span style="color: #FF9800;">Do zablokowania (${doZablokowania.length}):</span> ` + 
                     doZablokowania.map(id => { const k = wszystkieKrzesla.find(x => x.id === id); return `R${k.row}M${k.number}`; }).join(', ') + "<br><br>";
        }
        if (doZwolnienia.length > 0) {
            tekst += `<span style="color: #2196F3;">Do zwolnienia (${doZwolnienia.length}):</span> ` + 
                     doZwolnienia.map(id => { const k = wszystkieKrzesla.find(x => x.id === id); return `R${k.row}M${k.number}`; }).join(', ');
        }
        listaDiv.innerHTML = tekst;
        btnWykonaj.disabled = false;
    }
}

function budujTabeleRezerwacji() {
    const tbody = document.getElementById('tabela-rezerwacji-body');
    tbody.innerHTML = '';
    const zajete = wszystkieKrzesla.filter(k => k.status === "Oczekuje" || k.status === "Opłacone");
    
    if (zajete.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Brak rezerwacji w systemie</td></tr>';
        return;
    }

    // Grupowanie krzeseł po OrderNumber (żeby nie pisać 5 razy tego samego klienta)
    const zamowienia = {};
    zajete.forEach(k => {
        const nr = k.orderNumber || 'Brak (Ręczna)';
        if (!zamowienia[nr]) zamowienia[nr] = { klient: k.clientName, telefon: k.clientPhone, email: k.clientEmail, czas: k.reservationTime, status: k.status, miejsca: [] };
        zamowienia[nr].miejsca.push(`R${k.row}M${k.number}`);
    });

    const teraz = new Date();

    const cenaZaBilet = 50;

    Object.keys(zamowienia).forEach(nr => {
        const z = zamowienia[nr];
        const tr = document.createElement('tr');
        
        // Obliczanie czasu
        let czasWyswietlany = "-";
        let stylCzasu = "";
        if (z.czas && z.status === "Oczekuje") {
            const dataRezerwacji = new Date(z.czas);
            const roznicaMinut = Math.floor((teraz - dataRezerwacji) / (1000 * 60));
            czasWyswietlany = `${roznicaMinut} min temu`;
            if (roznicaMinut > 60) {
                stylCzasu = "color: red; font-weight: bold;";
                czasWyswietlany += " (CZAS MINĄŁ)";
            }
        }

        // Przyciski akcji
        let przyciski = "";
        if (nr !== 'Brak (Ręczna)') {
            if (z.status === "Oczekuje") {
                przyciski = `
                    <button onclick="potwierdzZamowienie('${nr}')" style="background:#4CAF50; color:white; padding:5px; border:none; cursor:pointer;">✅ Opłacone</button>
                    <button onclick="anulujZamowienie('${nr}')" style="background:#f44336; color:white; padding:5px; border:none; cursor:pointer;">❌ Zwolnij</button>
                `;
            } else if (z.status === "Opłacone") {
                przyciski = `<span style="color: green; font-weight: bold;">ZAKSIĘGOWANO</span>`;
            }
        }

        // NOWE: Obliczanie i wyświetlanie kwoty
        const liczbaBiletow = z.miejsca.length;
        const kwotaDoZaplaty = liczbaBiletow * cenaZaBilet;
        
        // Jeśli to rezerwacja ręczna (bez orderNumber), nie pokazuj kwoty
        const tekstKwoty = nr !== 'Brak (Ręczna)' 
            ? `<br><span style="color: #d32f2f; font-weight: bold; font-size: 1.1em;">${kwotaDoZaplaty} zł</span>` 
            : "";

        tr.innerHTML = `
            <td><b>${nr}</b><br><small style="${stylCzasu}">${czasWyswietlany}</small></td>
            <td>${z.klient || 'Admin'}<br><small>${z.email}</small><br><small>${z.telefon}</small></td>
            <td>${z.miejsca.join(', ')}</td>
            <td><b>${z.status}</b> ${tekstKwoty}</td>
            <td>${przyciski}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Nowe akcje z użyciem hasła
async function potwierdzZamowienie(nr) {
    if(confirm(`Potwierdzić wpłatę dla zamówienia ${nr}? Miejsca zostaną zablokowane na stałe.`)) {
        await fetch(`/api/TicketBooth/order/${nr}/confirm`, { method: 'PUT', headers: { 'Admin-Haslo': hasloAdmina } });
        ladujMiejsca();
    }
}

async function anulujZamowienie(nr) {
    if(confirm(`Brak wpłaty dla ${nr}? Miejsca wrócą do puli biletów.`)) {
        await fetch(`/api/TicketBooth/order/${nr}/cancel`, { method: 'PUT', headers: { 'Admin-Haslo': hasloAdmina } });
        ladujMiejsca();
    }
}

// Przesyłanie hasła w nagłówkach
async function wykonajZmiany() {
    if (!confirm(`Czy na pewno chcesz zatwierdzić te zmiany?\n\nBlokowane: ${doZablokowania.length}\nZwalniane: ${doZwolnienia.length}`)) {
        return;
    }
    const btnWykonaj = document.getElementById('btn-wykonaj');
    btnWykonaj.disabled = true;
    btnWykonaj.textContent = "Przetwarzanie...";

    // Dodajemy nagłówek 'Admin-Haslo' do zapytań!
    const opcjeZapytania = { 
        method: 'PUT', 
        headers: { 'Admin-Haslo': hasloAdmina } 
    };

    const zapytaniaBlokady = doZablokowania.map(id => fetch(`/api/TicketBooth/reserve/${id}`, opcjeZapytania));
    const zapytaniaZwolnienia = doZwolnienia.map(id => fetch(`/api/TicketBooth/cancel/${id}`, opcjeZapytania));
    
    // Czekamy na odpowiedzi
    const odpowiedzi = await Promise.all([...zapytaniaBlokady, ...zapytaniaZwolnienia]);
    
    // Sprawdzamy czy któreś zapytanie zwróciło błąd 401 (Unauthorized)
    const bladAutoryzacji = odpowiedzi.some(odp => odp.status === 401);
    
    if (bladAutoryzacji) {
        alert("Błąd: Podałeś błędne hasło administratora! Odśwież stronę i spróbuj ponownie.");
    } else {
        alert("Zmiany zostały pomyślnie wprowadzone do bazy!");
    }
    
    doZablokowania = [];
    doZwolnienia = [];
    btnWykonaj.textContent = "Zatwierdź zmiany";
    
    ladujMiejsca(); 
}