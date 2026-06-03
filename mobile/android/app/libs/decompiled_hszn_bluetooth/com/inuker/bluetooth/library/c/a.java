/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.bluetooth.BluetoothGattCharacteristic
 *  android.bluetooth.BluetoothGattDescriptor
 *  android.os.Parcel
 *  android.os.ParcelUuid
 *  android.os.Parcelable
 *  android.os.Parcelable$Creator
 */
package com.inuker.bluetooth.library.c;

import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.os.Parcel;
import android.os.ParcelUuid;
import android.os.Parcelable;
import com.inuker.bluetooth.library.c.b;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class a
implements Parcelable {
    private ParcelUuid b;
    private int c;
    private int d;
    private List<b> e;
    public static final Parcelable.Creator<a> a = new Parcelable.Creator<a>(){

        public a a(Parcel parcel) {
            return new a(parcel);
        }

        public a[] a(int n2) {
            return new a[n2];
        }

        public /* synthetic */ Object[] newArray(int n2) {
            return this.a(n2);
        }

        public /* synthetic */ Object createFromParcel(Parcel parcel) {
            return this.a(parcel);
        }
    };

    protected a(Parcel parcel) {
        this.b = (ParcelUuid)parcel.readParcelable(ParcelUuid.class.getClassLoader());
        this.c = parcel.readInt();
        this.d = parcel.readInt();
        this.e = parcel.createTypedArrayList(com.inuker.bluetooth.library.c.b.a);
    }

    public a(BluetoothGattCharacteristic bluetoothGattCharacteristic) {
        this.b = new ParcelUuid(bluetoothGattCharacteristic.getUuid());
        this.c = bluetoothGattCharacteristic.getProperties();
        this.d = bluetoothGattCharacteristic.getPermissions();
        for (BluetoothGattDescriptor bluetoothGattDescriptor : bluetoothGattCharacteristic.getDescriptors()) {
            this.d().add(new b(bluetoothGattDescriptor));
        }
    }

    public int describeContents() {
        return 0;
    }

    public void writeToParcel(Parcel parcel, int n2) {
        parcel.writeParcelable((Parcelable)this.b, n2);
        parcel.writeInt(this.c);
        parcel.writeInt(this.d);
        parcel.writeTypedList(this.e);
    }

    public UUID a() {
        return this.b.getUuid();
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

    public int c() {
        return this.d;
    }

    public void b(int n2) {
        this.d = n2;
    }

    public List<b> d() {
        if (this.e == null) {
            this.e = new ArrayList<b>();
        }
        return this.e;
    }

    public void a(List<b> list) {
        this.e = list;
    }

    public String toString() {
        return "BleGattCharacter{uuid=" + this.b + ", property=" + this.c + ", permissions=" + this.d + ", descriptors=" + this.e + '}';
    }
}

