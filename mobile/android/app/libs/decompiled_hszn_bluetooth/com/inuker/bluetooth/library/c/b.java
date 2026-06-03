/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.bluetooth.BluetoothGattDescriptor
 *  android.os.Parcel
 *  android.os.ParcelUuid
 *  android.os.Parcelable
 *  android.os.Parcelable$Creator
 */
package com.inuker.bluetooth.library.c;

import android.bluetooth.BluetoothGattDescriptor;
import android.os.Parcel;
import android.os.ParcelUuid;
import android.os.Parcelable;
import java.util.Arrays;

public class b
implements Parcelable {
    private ParcelUuid b;
    private int c;
    private byte[] d;
    public static final Parcelable.Creator<b> a = new Parcelable.Creator<b>(){

        public b a(Parcel parcel) {
            return new b(parcel);
        }

        public b[] a(int n2) {
            return new b[n2];
        }

        public /* synthetic */ Object[] newArray(int n2) {
            return this.a(n2);
        }

        public /* synthetic */ Object createFromParcel(Parcel parcel) {
            return this.a(parcel);
        }
    };

    protected b(Parcel parcel) {
        this.b = (ParcelUuid)parcel.readParcelable(ParcelUuid.class.getClassLoader());
        this.c = parcel.readInt();
        this.d = parcel.createByteArray();
    }

    public b(BluetoothGattDescriptor bluetoothGattDescriptor) {
        this.b = new ParcelUuid(bluetoothGattDescriptor.getUuid());
        this.c = bluetoothGattDescriptor.getPermissions();
        this.d = bluetoothGattDescriptor.getValue();
    }

    public int describeContents() {
        return 0;
    }

    public void writeToParcel(Parcel parcel, int n2) {
        parcel.writeParcelable((Parcelable)this.b, n2);
        parcel.writeInt(this.c);
        parcel.writeByteArray(this.d);
    }

    public ParcelUuid a() {
        return this.b;
    }

    public void a(ParcelUuid parcelUuid) {
        this.b = parcelUuid;
    }

    public int b() {
        return this.c;
    }

    public void a(int n2) {
        this.c = n2;
    }

    public byte[] c() {
        return this.d;
    }

    public void a(byte[] byArray) {
        this.d = byArray;
    }

    public String toString() {
        return "BleGattDescriptor{mUuid=" + this.b + ", mPermissions=" + this.c + ", mValue=" + Arrays.toString(this.d) + '}';
    }
}

