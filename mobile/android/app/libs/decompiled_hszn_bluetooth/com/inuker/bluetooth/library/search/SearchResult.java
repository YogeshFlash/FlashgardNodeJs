/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.bluetooth.BluetoothDevice
 *  android.os.Parcel
 *  android.os.Parcelable
 *  android.os.Parcelable$Creator
 *  android.text.TextUtils
 */
package com.inuker.bluetooth.library.search;

import android.bluetooth.BluetoothDevice;
import android.os.Parcel;
import android.os.Parcelable;
import android.text.TextUtils;

public class SearchResult
implements Parcelable {
    public BluetoothDevice a;
    public int b;
    public byte[] c;
    public static final Parcelable.Creator<SearchResult> d = new Parcelable.Creator<SearchResult>(){

        public SearchResult a(Parcel parcel) {
            return new SearchResult(parcel);
        }

        public SearchResult[] a(int n2) {
            return new SearchResult[n2];
        }

        public /* synthetic */ Object[] newArray(int n2) {
            return this.a(n2);
        }

        public /* synthetic */ Object createFromParcel(Parcel parcel) {
            return this.a(parcel);
        }
    };

    public SearchResult(BluetoothDevice bluetoothDevice) {
        this(bluetoothDevice, 0, null);
    }

    public SearchResult(BluetoothDevice bluetoothDevice, int n2, byte[] byArray) {
        this.a = bluetoothDevice;
        this.b = n2;
        this.c = byArray;
    }

    public String getName() {
        String string = this.a.getName();
        return TextUtils.isEmpty((CharSequence)string) ? "NULL" : string;
    }

    public String getAddress() {
        return this.a != null ? this.a.getAddress() : "";
    }

    public String toString() {
        StringBuilder stringBuilder = new StringBuilder();
        stringBuilder.append(", mac = " + this.a.getAddress());
        return stringBuilder.toString();
    }

    public int describeContents() {
        return 0;
    }

    public void writeToParcel(Parcel parcel, int n2) {
        parcel.writeParcelable((Parcelable)this.a, 0);
        parcel.writeInt(this.b);
        parcel.writeByteArray(this.c);
    }

    public SearchResult(Parcel parcel) {
        this.a = (BluetoothDevice)parcel.readParcelable(BluetoothDevice.class.getClassLoader());
        this.b = parcel.readInt();
        this.c = parcel.createByteArray();
    }

    public boolean equals(Object object) {
        if (this == object) {
            return true;
        }
        if (object == null || this.getClass() != object.getClass()) {
            return false;
        }
        SearchResult searchResult = (SearchResult)object;
        return this.a.equals((Object)searchResult.a);
    }

    public int hashCode() {
        return this.a.hashCode();
    }
}

