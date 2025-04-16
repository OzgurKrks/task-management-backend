import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  DEVELOPER = 'developer'
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

// Modelimizi yeniden oluşturmadan önce User koleksiyonundaki mevcut indeksleri kaldıralım
const dropIndexes = async () => {
  try {
    // MongoDB bağlantısı oluşturuldu ise
    if (mongoose.connection.readyState === 1) {
      // 'users' koleksiyonunun indekslerini kaldır 
      if (mongoose.connection.db) {
        await mongoose.connection.db.collection('users').dropIndexes();
        console.log('User collection indexes dropped successfully');
      }
    }
  } catch (error) {
    console.log('Error dropping indexes, might not exist yet:', error);
  }
};

// İndeksleri kaldırma işlemini çağır
dropIndexes();

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.DEVELOPER
    }
  },
  {
    timestamps: true
  }
);

// Önce tüm indeksleri devre dışı bırakalım
userSchema.set('autoIndex', false);

// Email için indeksi daha sonra manuel olarak ekleyelim
// Bu aşamada bir indeks eklenmesini istiyorsak ekleyebiliriz
// Ancak şu an için indeksleri tamamen kaldırıyoruz

// Hash password before saving
userSchema.pre('save', async function(this: IUser, next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

// User modelini kendi adıyla oluştur
// 'User', 'Users', 'user' veya 'users' değil, 'User' olarak belirtelim
const User = mongoose.model<IUser>('User', userSchema);

export default User; 