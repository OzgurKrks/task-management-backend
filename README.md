# Görev Yönetim Sistemi

Bu proje, kullanıcıların projeler oluşturup bu projeler altında görevler atayabileceği, takip edebileceği ve yönetebileceği, modern bir görev yönetim sisteminin backend API'sini içermektedir.

## Özellikler

- **Kullanıcı Yönetimi**: Kayıt, giriş ve kullanıcı profil yönetimi
- **Proje Yönetimi**: Proje oluşturma, okuma, güncelleme ve silme işlemleri
- **Görev Yönetimi**: Projeler altında görev oluşturma ve yönetme
- **Bildirim Sistemi**: Görev atamaları ve güncellemeleri için bildirimler
- **Gerçek Zamanlı Güncellemeler**: Socket.io ile gerçek zamanlı veri akışı
- **Rol Tabanlı Yetkilendirme**: Admin, developer gibi farklı kullanıcı rolleri
- **RESTful API**: Modern ve standartlara uygun API tasarımı

## Teknolojiler

- **Backend**: Node.js, Express.js, TypeScript
- **Veritabanı**: MongoDB, Mongoose
- **Kimlik Doğrulama**: JWT (JSON Web Token)
- **Gerçek Zamanlı İletişim**: Socket.io
- **Test**: Jest, Supertest, MongoDB Memory Server

## Kurulum

### Gereksinimler

- Node.js (v14 veya üzeri)
- MongoDB veritabanı (yerel veya uzak)

### Adımlar

1. Projeyi klonlayın:

   ```bash
   git clone <repo_url>
   cd task-management-backend
   ```

2. Bağımlılıkları yükleyin:

   ```bash
   npm install
   ```

3. `.env` dosyasını oluşturun:

   ```
   MONGODB_URI=<mongodb_connection_string>
   JWT_SECRET=<your_jwt_secret>
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   ```

4. Geliştirme modunda çalıştırın:
   ```bash
   npm run dev
   ```

## API Kullanımı

### Kimlik Doğrulama

- `POST /api/auth/register` - Yeni kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi

### Projeler

- `GET /api/projects` - Tüm projeleri listele
- `POST /api/projects` - Yeni proje oluştur
- `GET /api/projects/:id` - Belirli bir projeyi görüntüle
- `PUT /api/projects/:id` - Projeyi güncelle
- `DELETE /api/projects/:id` - Projeyi sil

### Görevler

- `GET /api/projects/:projectId/tasks` - Proje görevlerini listele
- `POST /api/projects/:projectId/tasks` - Yeni görev oluştur
- `GET /api/projects/:projectId/tasks/:taskId` - Belirli bir görevi görüntüle
- `PUT /api/projects/:projectId/tasks/:taskId` - Görevi güncelle
- `DELETE /api/projects/:projectId/tasks/:taskId` - Görevi sil

### Kullanıcılar

- `GET /api/users` - Tüm kullanıcıları listele
- `GET /api/users/:id` - Belirli bir kullanıcıyı görüntüle

### Bildirimler

- `GET /api/notifications` - Kullanıcının bildirimlerini listele
- `PUT /api/notifications/:id` - Bildirimi okundu olarak işaretle

## Test

```bash
# Tüm testleri çalıştır
npm test

# Geliştirme modunda testleri çalıştır (değişiklik yapıldığında otomatik yeniden çalıştırır)
npm run test:watch

# Test kapsamını görmek için
npm run test:coverage
```

## Derleme

```bash
npm run build
```

Bu komut, TypeScript kodunu JavaScript'e derleyerek `dist` klasörüne çıktı verir.

## Canlı Ortama Yükleme

```bash
npm start
```

Bu komut, uygulamayı derleyip canlı ortamda çalıştırır.
