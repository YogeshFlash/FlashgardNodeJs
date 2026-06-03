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

public interface l
extends IInterface {
    public void b(int var1, Bundle var2) throws RemoteException;

    public static abstract class b
    extends Binder
    implements l {
        private static final String a = "com.inuker.bluetooth.library.IResponse";
        static final int f = 1;

        public b() {
            this.attachInterface(this, a);
        }

        public static l a(IBinder iBinder) {
            if (iBinder == null) {
                return null;
            }
            IInterface iInterface = iBinder.queryLocalInterface(a);
            if (iInterface != null && iInterface instanceof l) {
                return (l)iInterface;
            }
            return new a(iBinder);
        }

        public IBinder asBinder() {
            return this;
        }

        public boolean onTransact(int n2, Parcel parcel, Parcel parcel2, int n3) throws RemoteException {
            String string = a;
            switch (n2) {
                case 1598968902: {
                    parcel2.writeString(string);
                    return true;
                }
                case 1: {
                    parcel.enforceInterface(string);
                    int n4 = parcel.readInt();
                    Bundle bundle = 0 != parcel.readInt() ? (Bundle)Bundle.CREATOR.createFromParcel(parcel) : null;
                    this.b(n4, bundle);
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

        public static boolean a(l l2) {
            if (a.a != null) {
                throw new IllegalStateException("setDefaultImpl() called twice");
            }
            if (l2 != null) {
                a.a = l2;
                return true;
            }
            return false;
        }

        public static l a() {
            return a.a;
        }

        private static class a
        implements l {
            private IBinder b;
            public static l a;

            a(IBinder iBinder) {
                this.b = iBinder;
            }

            public IBinder asBinder() {
                return this.b;
            }

            public String a() {
                return com.inuker.bluetooth.library.l$b.a;
            }

            /*
             * WARNING - Removed try catching itself - possible behaviour change.
             */
            @Override
            public void b(int n2, Bundle bundle) throws RemoteException {
                Parcel parcel = Parcel.obtain();
                Parcel parcel2 = Parcel.obtain();
                try {
                    parcel.writeInterfaceToken(com.inuker.bluetooth.library.l$b.a);
                    parcel.writeInt(n2);
                    if (bundle != null) {
                        parcel.writeInt(1);
                        bundle.writeToParcel(parcel, 0);
                    } else {
                        parcel.writeInt(0);
                    }
                    boolean bl = this.b.transact(1, parcel, parcel2, 0);
                    if (!bl && com.inuker.bluetooth.library.l$b.a() != null) {
                        com.inuker.bluetooth.library.l$b.a().b(n2, bundle);
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
    implements l {
        @Override
        public void b(int n2, Bundle bundle) throws RemoteException {
        }

        public IBinder asBinder() {
            return null;
        }
    }
}

