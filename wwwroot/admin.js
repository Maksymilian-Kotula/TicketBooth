let hasloAdmina = "";
let doZablokowania = [];
let doZwolnienia = [];
let wszystkieKrzesla = [];

// NOWE: Funkcja logowania
function zaloguj() {
    const wpisaneHaslo = document.getElementById('admin-haslo-input').value;
    if (!wpisaneHaslo) {
        alert("Podaj hasło!");
        return;
    }
    hasloAdmina = wpisaneHaslo;
    document.getElementById('ekran-logowania').style.display = 'none';
    document.getElementById('panel-admina').style.display = 'block';
    ladujMiejsca(); 
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
    const zajete = wszystkieKrzesla.filter(k => k.status !== "Wolne");
    
    if (zajete.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Brak rezerwacji w systemie</td></tr>';
        return;
    }

    zajete.forEach(k => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>Rząd ${k.row}, Miejsce ${k.number}</b></td>
            <td>${k.clientName || '<span style="color: #999;">Rezerwacja ręczna</span>'}</td>
            <td>${k.clientEmail || '-'}</td>
            <td>${k.clientPhone || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// NOWE: Przesyłanie hasła w nagłówkach
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