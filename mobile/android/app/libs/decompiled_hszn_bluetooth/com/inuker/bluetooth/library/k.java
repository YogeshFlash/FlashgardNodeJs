/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Binder
 *  android.os.Bundle
 *  android.os.IBinder
 *  android.os.IInterface
 *  android.os.Parcel
 *  android.os.RemoteException
 */
package com.inuker.bluetooth.library;

import android.os.Binder;
import android.os.Bundle;
import android.os.IBinder;
import android.os.IInterface;
import android.os.Parcel;
import android.os.RemoteException;
import com.inuker.bluetooth.library.l;

public interface k
extends IInterface {
    public void a(int var1, Bundle var2, l var3) throws RemoteException;

    public static abstract class b
    extends Binder
    implements k {
        private static final String b = "com.inuker.bluetooth.library.IBluetoothService";
        static final int a = 1;

        public b() {
            this.attachInterface(this, b);
        }

        public static k a(IBinder iBinder) {
            if (iBinder == null) {
                return null;
            }
            IInterface iInterface = iBinder.queryLocalInterface(b);
            if (iInterface != null && iInterface instanceof k) {
                return (k)iInterface;
            }
            return new a(iBinder);
        }

        public IBinder asBinder() {
            return this;
        }

        public boolean onTransact(int n2, Parcel parcel, Parcel parcel2, int n3) throws RemoteException {
            String string = b;
            switch (n2) {
                case 1598968902: {
                    parcel2.writeString(string);
                    return true;
                }
                case 1: {
                    parcel.enforceInterface(string);
                    int n4 = parcel.readInt();
                    Bundle bundle = 0 != parcel.readInt() ? (Bundle)Bundle.CREATOR.createFromParcel(parcel) : null;
                    l l2 = l.b.a(parcel.readStrongBinder());
                    this.a(n4, bundle, l2);
                    parcel2.writeNoException();
                    if (bundle != null) {
                        parcel2.writeInt(1);
                        bundle.writeToParcel(parcel2, 1);
                    } else {
                        parcel2.writeInt(0);
                    }
                    return true;
                }
            }
            return super.onTransact(n2, parcel, parcel2, n3);
        }

        public static boolean a(k k2) {
            if (a.a != null) {
                throw new IllegalStateException("setDefaultImpl() called twice");
            }
            if (k2 != null) {
                a.a = k2;
                return true;
            }
            return false;
        }

        public static k b() {
            return a.a;
        }

        private static class a
        implements k {
            private IBinder b;
            public static k a;

            a(IBinder iBinder) {
                this.b = iBinder;
            }

            public IBinder asBinder() {
                return this.b;
            }

            public String a() {
                return com.inuker.bluetooth.library.k$b.b;
            }

            /*
             * WARNING - Removed try catching itself - possible behaviour change.
             */
            @Override
            public void a(int n2, Bundle bundle, l l2) throws RemoteException {
                Parcel parcel = Parcel.obtain();
                Parcel parcel2 = Parcel.obtain();
                try {
                    parcel.writeInterfaceToken(com.inuker.bluetooth.library.k$b.b);
                    parcel.writeInt(n2);
                    if (bundle != null) {
                        parcel.writeInt(1);
                        bundle.writeToParcel(parcel, 0);
                    } else {
                        parcel.writeInt(0);
                    }
                    parcel.writeStrongBinder(l2 != null ? l2.asBinder() : null);
                    boolean bl = this.b.transact(1, parcel, parcel2, 0);
                    if (!bl && com.inuker.bluetooth.library.k$b.b() != null) {
                        com.inuker.bluetooth.library.k$b.b().a(n2, bundle, l2);
                        return;
                    }
                    parcel2.readException();
                    if (0 != parcel2.readInt()) {
                        bundle.readFromParcel(parcel2);
                    }
                }
                finally {
                    parcel2.recycle();
                    parcel.recycle();
                }
            }
        }
    }

    public static class a
    implements k {
        @Override
        public void a(int n2, Bundle bundle, l l2) throws RemoteException {
        }

        public IBinder asBinder() {
            return null;
        }
    }
}

