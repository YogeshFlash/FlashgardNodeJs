/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.bluetooth.BluetoothGattCharacteristic
 *  android.os.Parcel
 *  android.os.ParcelUuid
 *  android.os.Parcelable
 *  android.os.Parcelable$Creator
 */
package com.inuker.bluetooth.library.c;

import android.bluetooth.BluetoothGattCharacteristic;
import android.os.Parcel;
import android.os.ParcelUuid;
import android.os.Parcelable;
import com.inuker.bluetooth.library.c.a;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class d
implements Parcelable,
Comparable {
    private ParcelUuid b;
    private List<a> c;
    public static final Parcelable.Creator<d> a = new Parcelable.Creator<d>(){

        public d a(Parcel parcel) {
            return new d(parcel);
        }

        public d[] a(int n2) {
            return new d[n2];
        }

        public /* synthetic */ Object[] newArray(int n2) {
            return this.a(n2);
        }

        public /* synthetic */ Object createFromParcel(Parcel parcel) {
            return this.a(parcel);
        }
    };

    public d(UUID uUID, Map<UUID, BluetoothGattCharacteristic> map) {
        this.b = new ParcelUuid(uUID);
        for (BluetoothGattCharacteristic bluetoothGattCharacteristic : map.values()) {
            this.b().add(new a(bluetoothGattCharacteristic));
        }
    }

    protected d(Parcel parcel) {
        this.b = (ParcelUuid)parcel.readParcelable(ParcelUuid.class.getClassLoader());
        this.c = parcel.createTypedArrayList(com.inuker.bluetooth.library.c.a.a);
    }

    public UUID a() {
        return this.b.getUuid();
    }

    public List<a> b() {
        if (this.c == null) {
            this.c = new ArrayList<a>();
        }
        return this.c;
    }

    public String toString() {
        StringBuilder stringBuilder = new StringBuilder();
        stringBuilder.append(String.format("Service: %s\n", this.b));
        List<a> list = this.b();
        int n2 = list.size();
        for (int i2 = 0; i2 < n2; ++i2) {
            stringBuilder.append(String.format(">>> Character: %s", list.get(i2)));
            if (i2 == n2 - 1) continue;
            stringBuilder.append("\n");
        }
        return stringBuilder.toString();
    }

    public int compareTo(Object object) {
        if (object == null) {
            return 1;
        }
        d d2 = (d)object;
        return this.a().compareTo(d2.a());
    }

    public int describeContents() {
        return 0;
    }

    public void writeToParcel(Parcel parcel, int n2) {
        parcel.writeParcelable((Parcelable)this.b, n2);
        parcel.writeTypedList(this.c);
    }
}

